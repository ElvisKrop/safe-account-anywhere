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

  useEffect(() => {
    setChains((prev) => ({ ...prev, targetChain: null }))
  }, [])

  const addLog = useCallback((message: string, type: "info" | "success" | "error" = "info") => {
    setLogs((prevLogs) => [...prevLogs, { message, type, timestamp: new Date() }])
  }, [])

  const fetchTargetChainInfo = async (chainId: string) => {
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
      setTargetChainIdInput("") // Clear the input after successful fetch
    } catch (err) {
      console.error("Error in fetchTargetChainInfo:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch target chain information or verify contracts. Please check the Chain ID and try again.",
      )
      addLog("Error: Failed to fetch target chain information or verify contracts", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const ExplorerLink = ({ type, value }: { type: "address" | "tx"; value: string }) => (
    <Link
      href={`${chains.targetChain?.explorerUrl}/${type}/${value}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 hover:underline break-all"
    >
      {value}
    </Link>
  )

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="targetChainId">Target Chain ID</Label>
        <div className="flex gap-2">
          <Input
            id="targetChainId"
            value={targetChainIdInput}
            onChange={(e) => setTargetChainIdInput(e.target.value)}
            placeholder="e.g., 137 for Polygon"
          />
          <Button onClick={() => fetchTargetChainInfo(targetChainIdInput)} disabled={isLoading}>
            {isLoading ? "Fetching..." : "Fetch Information"}
          </Button>
        </div>
      </div>
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

