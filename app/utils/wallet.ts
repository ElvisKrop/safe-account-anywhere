import { init, useConnectWallet } from "@web3-onboard/react"
import injectedModule from "@web3-onboard/injected-wallets"
import { fetchChainInfo } from "./chainInfo"
import { createPublicClient, http, createWalletClient, custom, extractChain } from "viem"
import * as chains from "viem/chains"

const injected = injectedModule()

init({
  wallets: [injected],
  chains: [
    {
      id: "0x1",
      token: "ETH",
      label: "Ethereum Mainnet",
      rpcUrl: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
    },
  ],
})

export const useWallet = useConnectWallet

export async function checkWalletBalance(address: string, chainId: string) {
  const chainInfo = await fetchChainInfo(chainId)
  if (!chainInfo.rpcUrls || chainInfo.rpcUrls.length === 0) {
    throw new Error("No RPC URLs available for this chain")
  }

  const client = createPublicClient({
    transport: http(chainInfo.rpcUrls[0]), // Use the first RPC URL
  })

  try {
    const balance = await client.getBalance({ address: address as `0x${string}` })
    return balance
  } catch (error) {
    console.error("Error checking wallet balance:", error)
    throw new Error("Failed to check wallet balance")
  }
}

export async function getCurrentNetwork(provider: any) {
  try {
    const chainId = await provider.request({ method: "eth_chainId" })
    const chainInfo = await fetchChainInfo(Number.parseInt(chainId, 16).toString())
    return {
      chainId: chainId,
      name: chainInfo.name,
    }
  } catch (error) {
    console.error("Error getting current network:", error)
    throw new Error("Failed to get current network information")
  }
}

export async function deploySafe(
  provider: any,
  destinationChainId: any,
  factoryAddress: string,
  deploymentData: string,
  onLog: (message: string, type: "info" | "success" | "error") => void,
): Promise<{ txHash: string; safeAddress: string }> {
  if (!provider) throw new Error("No provider available")

  try {
    onLog("Creating signer...", "info")

    onLog("Preparing deployment transaction...", "info")

    const walletClient = createWalletClient({
      chain: extractChain({
        chains: Object.values(chains),
        id: destinationChainId,
      }),
      transport: custom(provider),
    })

    const [account] = await walletClient.getAddresses()
    const hash = await walletClient.sendTransaction({
      account,
      to: factoryAddress,
      data: deploymentData,
      value: "0x0",
    })

    onLog(`Transaction sent. Hash: ${hash}`, "success")

    onLog("Waiting for transaction confirmation...", "info")
    const receipt = await walletClient.waitForTransactionReceipt({ hash })

    const safeAddress = receipt.logs[0].address // Assuming the first event is the ProxyCreation event
    onLog(`Safe deployed at: ${safeAddress}`, "success")
    return { txHash: hash, safeAddress }
  } catch (error) {
    console.error("Error deploying Safe:", error)
    onLog(`Error deploying Safe: ${error instanceof Error ? error.message : String(error)}`, "error")
    throw error
  }
}

