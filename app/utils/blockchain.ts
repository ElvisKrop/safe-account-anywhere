import { createPublicClient, http, fallback, decodeAbiParameters, parseAbiParameters } from "viem"

export async function verifySafeDeployment(rpcUrls: string[], safeAddress: string) {
  if (!rpcUrls || rpcUrls.length === 0) {
    throw new Error("RPC URLs are missing. Please ensure the chain information is correctly fetched and passed.")
  }
  try {
    const client = createPublicClientForChain(rpcUrls)
    const code = await client.getBytecode({ address: safeAddress as `0x${string}` })
    return code !== undefined && code !== "0x"
  } catch (error) {
    console.error("Error verifying Safe deployment:", error)
    throw error
  }
}

export async function parseDeploymentTransaction(rpcUrls: string[], txHash: string, addLog: any) {
  if (!rpcUrls || rpcUrls.length === 0) {
    throw new Error("RPC URLs are missing")
  }
  try {
    const client = createPublicClientForChain(rpcUrls)
    const tx = await client.getTransaction({ hash: txHash as `0x${string}` })
    addLog("Tx received from the blockchain", "success")

    if (!tx.input.startsWith("0x1688f0b9")) {
      throw new Error("This transaction does not appear to be a Safe deployment transaction")
    }
    addLog("Tx data matches safe deployment transaction", "success")

    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` })

    const proxyCreationEvent = receipt.logs.find(
      (log) => log.topics[0] === "0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235",
    )

    if (!proxyCreationEvent) {
      throw new Error("ProxyCreation event not found in transaction logs")
    }

    addLog("Tx has a ProxyCreation event", "success")

    let safeAddress: string
    let singleton: string

    if (proxyCreationEvent.topics.length > 1) {
      // Safe 1.4.1
      safeAddress = `0x${proxyCreationEvent.topics[1].slice(26)}`
      addLog("Detected Safe v1.4.1 deployment", "success")
    } else {
      // Safe 1.3.0
      ;[safeAddress, singleton] = decodeAbiParameters(
        [{ type: "address" }, { type: "address" }],
        proxyCreationEvent.data,
      )
      addLog("Detected Safe v1.3.0 deployment", "success")
    }

    addLog("Safe Proxy address decoded from event", "success")

    const inputData = `0x${tx.input.slice(10)}`
    const paramTypes = parseAbiParameters(["address _singleton", "bytes initializer", "uint256 saltNonce"])
    const [, initializer, saltNonce] = decodeAbiParameters(paramTypes, inputData)

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
      hex: tx.input,
      safeAddress,
    }
  } catch (error) {
    console.error("Error parsing deployment transaction:", error)
    throw error
  }
}

export async function getTransactionInfo(rpcUrls: string[], txHash: string) {
  if (!rpcUrls || rpcUrls.length === 0) {
    throw new Error("RPC URLs are missing")
  }
  try {
    const client = createPublicClientForChain(rpcUrls)
    const tx = await client.getTransaction({ hash: txHash as `0x${string}` })

    return {
      from: tx.from,
      to: tx.to,
    }
  } catch (error) {
    console.error("Error getting transaction info:", error)
    throw error
  }
}

export function createPublicClientForChain(rpcUrls: string[]) {
  // Create an array of HTTP transports for each RPC URL
  const transports = rpcUrls.map((url) => http(url))

  return createPublicClient({
    transport: fallback(transports, {
      rank: true, // Automatically rank transports by response time
      retryCount: 3, // Retry each transport 3 times before moving to the next
      retryDelay: 1000, // Wait 1 second between retries
    }),
  })
}

export async function verifyContractDeployment(rpcUrls: string[], address: string) {
  if (!rpcUrls || rpcUrls.length === 0) {
    throw new Error("RPC URLs are missing")
  }
  try {
    const client = createPublicClientForChain(rpcUrls)
    const code = await client.getBytecode({ address: address as `0x${string}` })
    return code !== undefined && code !== "0x"
  } catch (error) {
    console.error("Error verifying contract deployment:", error)
    throw error
  }
}
