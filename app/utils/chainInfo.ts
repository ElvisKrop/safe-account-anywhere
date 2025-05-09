import { createPublicClient, http, fallback } from "viem"

export async function fetchChainInfo(chainId: string) {
  if (!chainId || isNaN(Number(chainId))) {
    throw new Error(`Invalid chainId: ${chainId}`)
  }

  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/chains/eip155-${chainId}.json`,
    )
    if (!response.ok) {
      throw new Error(`Failed to fetch chain info for chain ID ${chainId}. Status: ${response.status}`)
    }
    const chainInfo = await response.json()

    const explorerUrl =
      chainInfo.explorers && chainInfo.explorers[0] && chainInfo.explorers[0].url
        ? chainInfo.explorers[0].url
        : chainInfo.infoURL

    if (!chainInfo.rpc || chainInfo.rpc.length === 0) {
      throw new Error(`No RPC URLs found for chain ID ${chainId}`)
    }

    // Filter out RPC URLs with template variables like ${API_KEY}
    const filteredRpcUrls = chainInfo.rpc.filter((url: string) => !url.includes("${"))

    if (filteredRpcUrls.length === 0) {
      throw new Error(`No usable RPC URLs found for chain ID ${chainId}. All URLs require API keys or other variables.`)
    }

    // Filter for HTTPS RPC URLs
    const httpsRpcUrls = filteredRpcUrls.filter((url: string) => url.startsWith("https://"))

    // If no HTTPS URLs are available, use all filtered URLs
    const rpcUrls = httpsRpcUrls.length > 0 ? httpsRpcUrls : filteredRpcUrls

    return {
      chainId: chainInfo.chainId,
      name: chainInfo.name,
      rpcUrls: rpcUrls,
      explorerUrl,
      nativeCurrency: {
        name: chainInfo.nativeCurrency.name,
        symbol: chainInfo.nativeCurrency.symbol,
        decimals: chainInfo.nativeCurrency.decimals,
      },
    }
  } catch (error) {
    console.error("Error fetching chain info:", error)
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
