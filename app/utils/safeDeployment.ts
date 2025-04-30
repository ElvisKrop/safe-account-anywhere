import { decodeAbiParameters, parseAbiParameters } from "viem"
import { createPublicClientForChain } from "./chainInfo"
import { fetchChainInfo } from "./chainInfo"

export async function verifySafeDeployment(rpcUrls: string[], safeAddress: string) {
  try {
    const client = createPublicClientForChain(rpcUrls)
    const code = await client.getBytecode({ address: safeAddress as `0x${string}` })
    return code !== undefined && code !== "0x"
  } catch (error) {
    console.error("Error verifying Safe deployment:", error)
    throw error
  }
}

export async function parseDeploymentTransaction(rpcUrls: string[], txHash: string) {
  try {
    const client = createPublicClientForChain(rpcUrls)
    const tx = await client.getTransaction({ hash: txHash as `0x${string}` })

    if (!tx.input.startsWith("0x1688f0b9")) {
      throw new Error("This transaction does not appear to be a Safe deployment transaction")
    }

    const inputData = `0x${tx.input.slice(10)}`
    const paramTypes = parseAbiParameters(["address _singleton", "bytes initializer", "uint256 saltNonce"])
    const [singleton, initializer, saltNonce] = decodeAbiParameters(paramTypes, inputData)

    const initializerData = initializer as `0x${string}`
    const setupParamTypes = parseAbiParameters([
      "address[]",
      "uint256",
      "address",
      "bytes",
      "address",
      "address",
      "uint256",
      "address",
    ])
    const [owners, threshold, to, data, fallbackHandler, paymentToken, payment, paymentReceiver] = decodeAbiParameters(
      setupParamTypes,
      initializerData.slice(8),
    )

    return {
      factoryAddress: tx.to,
      singleton,
      owners,
      threshold,
      fallbackHandler,
      saltNonce: saltNonce.toString(),
    }
  } catch (error) {
    console.error("Error parsing deployment transaction:", error)
    throw error
  }
}

export async function getFactoryAddress(sourceChainId: string, txHash: string) {
  try {
    const chainInfo = await fetchChainInfo(sourceChainId)
    if (!chainInfo.rpcUrls || chainInfo.rpcUrls.length === 0) {
      throw new Error("No RPC URLs available for this chain")
    }
    const deploymentDetails = await parseDeploymentTransaction(chainInfo.rpcUrls, txHash)
    return deploymentDetails.factoryAddress
  } catch (error) {
    console.error("Error getting factory address:", error)
    throw error
  }
}
