"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fetchChainInfo, verifyContractDeployment } from "../utils/blockchain"
import Link from "next/link"
import { LogDisplay } from "./log-display"
import { useSafeAccount } from "../context/safe-account-context"
import { useChains } from "../context/chains-context"
import { Loader2 } from "lucide-react"
import { createPublicClient, http } from "viem"

const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

interface TargetChainStepProps {
  onNext: () => void
  onPrev: () => void
}

export function TargetChainStep({ onNext, onPrev }: TargetChainStepProps) {
  const { safeAccount, setSafeAccount } = useSafeAccount()
  const { chains, setChains } = useChains()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFactoryDeployed, setIsFactoryDeployed] = useState(false)
  const [isSafeAlreadyDeployed, setIsSafeAlreadyDeployed] = useState(false)
  const [logs, setLogs] = useState<Array<{ message: string; type: "info" | "success" | "error"; timestamp: Date }>>([])
  const [targetChainIdInput, setTargetChainIdInput] = useState("")
  const [customRpcUrl, setCustomRpcUrl] = useState("")
  const [customRpcError, setCustomRpcError] = useState<string | null>(null)
  const [isLoadingCustom, setIsLoadingCustom] = useState(false)
  const [chainDataFetchFailed, setChainDataFetchFailed] = useState(false)

  useEffect(() => {
    setChains((prev) => ({ ...prev, targetChain: null }))
  }, [])

  const addLog = useCallback((message: string, type: "info" | "success" | "error" = "info") => {
    setLogs((prevLogs) => [...prevLogs, { message, type, timestamp: new Date() }])
  }, [])

  const handleFetchTargetChainInfo = useCallback(
    debounce(async (chainId: string) => {
      if (!chainId) {
        setError("Please enter a target chain ID")
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        setIsFactoryDeployed(false)
        setIsSafeAlreadyDeployed(false)

        addLog("Fetching target chain information...", "info")
        const chainInfo = await fetchChainInfo(chainId)

        // Reset the chain data fetch failed flag and clear custom RPC URL
        // when we successfully fetch chain data
        setChainDataFetchFailed(false)
        setCustomRpcUrl("")
        setCustomRpcError(null)

        setChains((prev) => ({ ...prev, targetChain: chainInfo }))
        addLog("Target chain information fetched successfully", "success")

        if (safeAccount.factoryAddress) {
          addLog("Verifying factory deployment on target chain...", "info")
          const factoryDeployed = await verifyContractDeployment(chainInfo.rpcUrls, safeAccount.factoryAddress)
          setIsFactoryDeployed(factoryDeployed)
          addLog(
            factoryDeployed ? "Factory is deployed on target chain" : "Factory is not deployed on target chain",
            factoryDeployed ? "success" : "error",
          )

          if (!factoryDeployed) {
            setError(
              "The Safe factory is not deployed on the target chain. Please choose a different chain or deploy the factory first.",
            )
            return
          }
        } else {
          addLog("Factory address is not available", "error")
          setIsFactoryDeployed(false)
          setError("Factory address is not available. Please complete the verification step first.")
          return
        }

        addLog("Checking if Safe is already deployed on target chain...", "info")
        const safeDeployed = await verifyContractDeployment(chainInfo.rpcUrls, safeAccount.safeAddress)
        setIsSafeAlreadyDeployed(safeDeployed)
        addLog(
          safeDeployed ? "Safe is already deployed on target chain" : "Safe is not yet deployed on target chain",
          safeDeployed ? "error" : "success",
        )

        if (safeDeployed) {
          setError(
            "A Safe with this address is already deployed on the target chain. Please choose a different chain or use a different Safe.",
          )
        }
      } catch (err) {
        console.error("Error in fetchTargetChainInfo:", err)
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch target chain information or verify contracts. Please check the Chain ID and try again.",
        )
        addLog("Error: Failed to fetch target chain information or verify contracts", "error")
        setChainDataFetchFailed(true)
      } finally {
        setIsLoading(false)
      }
    }, 800),
    [addLog, safeAccount.factoryAddress, safeAccount.safeAddress, setChains],
  )

  // Add this useEffect after the other useEffect in the component
  useEffect(() => {
    // If the user is typing a new chain ID, reset the custom RPC state
    if (targetChainIdInput) {
      setCustomRpcUrl("")
      setCustomRpcError(null)
    }
  }, [targetChainIdInput])

  const handleCustomRpcFetch = async () => {
    if (!customRpcUrl || !customRpcUrl.startsWith("https://")) {
      setCustomRpcError("Please enter a valid HTTPS RPC URL")
      return
    }

    try {
      setIsLoadingCustom(true)
      setCustomRpcError(null)
      setError(null)
      setIsFactoryDeployed(false)
      setIsSafeAlreadyDeployed(false)

      addLog("Connecting to custom RPC endpoint...", "info")

      // Create a temporary client to get chain information
      const transport = http(customRpcUrl)
      const tempClient = createPublicClient({ transport })

      // Get chain ID from the RPC endpoint
      const chainIdHex = await tempClient.request({ method: "eth_chainId" })
      const chainIdDecimal = Number.parseInt(chainIdHex, 16).toString()

      addLog(`Connected to chain with ID: ${chainIdDecimal}`, "success")

      // Try to get chain name
      let chainName = "Custom Chain"
      try {
        const networkResponse = await tempClient.request({ method: "net_version" })
        if (networkResponse) {
          chainName = `Custom Chain (${networkResponse})`
        }
      } catch (err) {
        console.log("Could not get network name, using default")
      }

      // Create custom chain info
      const customChainInfo = {
        chainId: chainIdDecimal,
        name: chainName,
        rpcUrls: [customRpcUrl],
        explorerUrl: "",
        nativeCurrency: {
          name: "Native Token",
          symbol: "ETH",
          decimals: 18,
        },
      }

      setChains((prev) => ({ ...prev, targetChain: customChainInfo }))
      addLog("Custom chain information set successfully", "success")

      if (safeAccount.factoryAddress) {
        addLog("Verifying factory deployment on custom chain...", "info")
        const factoryDeployed = await verifyContractDeployment([customRpcUrl], safeAccount.factoryAddress)
        setIsFactoryDeployed(factoryDeployed)
        addLog(
          factoryDeployed ? "Factory is deployed on custom chain" : "Factory is not deployed on custom chain",
          factoryDeployed ? "success" : "error",
        )

        if (!factoryDeployed) {
          setError(
            "The Safe factory is not deployed on the custom chain. Please choose a different chain or deploy the factory first.",
          )
          return
        }
      }

      addLog("Checking if Safe is already deployed on custom chain...", "info")
      const safeDeployed = await verifyContractDeployment([customRpcUrl], safeAccount.safeAddress)
      setIsSafeAlreadyDeployed(safeDeployed)
      addLog(
        safeDeployed ? "Safe is already deployed on custom chain" : "Safe is not yet deployed on custom chain",
        safeDeployed ? "error" : "success",
      )

      if (safeDeployed) {
        setError(
          "A Safe with this address is already deployed on the custom chain. Please choose a different chain or use a different Safe.",
        )
      }

      setCustomRpcUrl("")
    } catch (err) {
      console.error("Error connecting to custom RPC:", err)
      setCustomRpcError(
        err instanceof Error
          ? err.message
          : "Failed to connect to custom RPC endpoint. Please check the URL and try again.",
      )
      addLog("Error: Failed to connect to custom RPC endpoint", "error")
    } finally {
      setIsLoadingCustom(false)
    }
  }

  const ExplorerLink = ({ type, value }: { type: "address" | "tx"; value: string }) => {
    // If we don't have an explorer URL or it's empty, just show the address without a link
    if (!chains.targetChain?.explorerUrl) {
      return <span className="font-mono text-blue-500">{value}</span>
    }

    return (
      <Link
        href={`${chains.targetChain.explorerUrl}/${type}/${value}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline break-all font-mono"
      >
        {value}
      </Link>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="targetChainId">Target Chain ID</Label>
        <div className="flex gap-2">
          <Input
            id="targetChainId"
            value={targetChainIdInput}
            onChange={(e) => {
              const value = e.target.value
              setTargetChainIdInput(value)
              // Only allow numeric input
              if (value === "" || /^\d+$/.test(value)) {
                handleFetchTargetChainInfo(value)
              }
            }}
            placeholder="e.g., 137 for Polygon"
          />
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      </div>
      {(chainDataFetchFailed ||
        (chains.targetChain && (!chains.targetChain.rpcUrls || chains.targetChain.rpcUrls.length === 0))) && (
        <div className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor="customRpcUrl">Custom RPC URL</Label>
            <span className="ml-2 text-xs text-muted-foreground">(Network data unavailable or missing RPC URLs)</span>
          </div>
          <div className="flex gap-2">
            <Input
              id="customRpcUrl"
              value={customRpcUrl}
              onChange={(e) => setCustomRpcUrl(e.target.value)}
              placeholder="https://..."
            />
            <Button
              onClick={handleCustomRpcFetch}
              disabled={isLoading || !customRpcUrl || !customRpcUrl.startsWith("https://")}
            >
              {isLoadingCustom ? "Connecting..." : "Connect"}
            </Button>
          </div>
          {customRpcError && <p className="text-red-500 text-sm">{customRpcError}</p>}
        </div>
      )}
      {isLoading && <p>Loading target chain information...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {chains.targetChain && (
        <div>
          <h4 className="text-md font-semibold">Target Chain Information:</h4>
          <p>Name: {chains.targetChain.name}</p>
          <p>RPC Endpoints: {chains.targetChain.rpcUrls.length} available</p>
          {safeAccount.factoryAddress && (
            <p>
              Factory Address: <ExplorerLink type="address" value={safeAccount.factoryAddress} />
              {isFactoryDeployed ? (
                <span className="text-green-500 ml-2">(Deployed)</span>
              ) : (
                <span className="text-red-500 ml-2">(Not Deployed)</span>
              )}
            </p>
          )}
          <p>
            Safe Address: <ExplorerLink type="address" value={safeAccount.safeAddress} />
            {isSafeAlreadyDeployed ? (
              <span className="text-red-500 ml-2">(Already Deployed)</span>
            ) : (
              <span className="text-green-500 ml-2">(Not Deployed)</span>
            )}
          </p>
        </div>
      )}
      <div className="flex justify-between">
        <Button onClick={onPrev}>Previous</Button>
        <Button onClick={onNext} disabled={!chains.targetChain || !isFactoryDeployed || isSafeAlreadyDeployed}>
          Next
        </Button>
      </div>
      <LogDisplay logs={logs} />
    </div>
  )
}
