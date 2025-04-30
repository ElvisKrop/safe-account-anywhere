import { init, useConnectWallet } from "@web3-onboard/react"
import injectedModule from "@web3-onboard/injected-wallets"
import { fetchChainInfo } from "./chainInfo"
import { createPublicClient, http, fallback, createWalletClient, custom, extractChain } from "viem"
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

  // Create an array of HTTP transports for each RPC URL
  const transports = chainInfo.rpcUrls.map((url) => http(url))

  const client = createPublicClient({
    transport: fallback(transports, {
      rank: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
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

    // Create a public client for reading blockchain data
    const chainInfo = await fetchChainInfo(destinationChainId)
    const transports = chainInfo.rpcUrls.map((url) => http(url))
    const publicClient = createPublicClient({
      chain: extractChain({
        chains: Object.values(chains),
        id: destinationChainId,
      }),
      transport: fallback(transports, {
        rank: true,
        retryCount: 3,
        retryDelay: 1000,
      }),
    })

    // Create wallet client for sending transactions
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
      to: factoryAddress as `0x${string}`,
      data: deploymentData as `0x${string}`,
      value: BigInt(0),
    })

    onLog(`Transaction sent. Hash: ${hash}`, "success")

    onLog("Waiting for transaction confirmation...", "info")

    // Use the publicClient to wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 60_000, // 60 seconds timeout
      confirmations: 1,
    })

    // Find the ProxyCreation event in the logs
    const proxyCreationEvent = receipt.logs.find(
      (log) => log.topics[0] === "0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235",
    )

    if (!proxyCreationEvent) {
      throw new Error("ProxyCreation event not found in transaction logs")
    }

    // Extract the Safe address from the event
    const safeAddress = proxyCreationEvent.address
    onLog(`Safe deployed at: ${safeAddress}`, "success")

    return { txHash: hash, safeAddress }
  } catch (error) {
    console.error("Error deploying Safe:", error)
    onLog(`Error deploying Safe: ${error instanceof Error ? error.message : String(error)}`, "error")
    throw error
  }
}
