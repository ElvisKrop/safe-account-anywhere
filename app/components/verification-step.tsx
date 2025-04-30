"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { verifySafeDeployment } from "../utils/blockchain"
import Link from "next/link"
import { LogDisplay } from "./log-display"
import { useSafeAccount } from "../context/safe-account-context"
import { useChains } from "../context/chains-context"

interface VerificationStepProps {
  onNext: () => void
  onPrev: () => void
}

const addLog = (
  setLogs: React.Dispatch<
    React.SetStateAction<Array<{ message: string; type: "info" | "success" | "error"; timestamp: Date }>>
  >,
  message: string,
  type: "info" | "success" | "error" = "info",
) => {
  setLogs((prevLogs) => [...prevLogs, { message, type, timestamp: new Date() }])
}

export function VerificationStep({ onNext, onPrev }: VerificationStepProps) {
  const { safeAccount } = useSafeAccount()
  const { chains } = useChains()
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<Array<{ message: string; type: "info" | "success" | "error"; timestamp: Date }>>([])

  useEffect(() => {
    const verifyDeployment = async () => {
      if (!chains.sourceChain || !chains.sourceChain.rpcUrls || chains.sourceChain.rpcUrls.length === 0) {
        setError("Source chain information or RPC URLs are missing")
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        addLog(setLogs, "Verifying Safe deployment...", "info")
        const isVerified = await verifySafeDeployment(chains.sourceChain.rpcUrls, safeAccount.safeAddress)
        setIsVerified(isVerified)
        addLog(
          setLogs,
          isVerified ? "Safe deployment verified successfully" : "Failed to verify Safe deployment",
          isVerified ? "success" : "error",
        )
      } catch (err) {
        console.error("Error in verifyDeployment:", err)
        setError(`Failed to verify Safe deployment: ${err instanceof Error ? err.message : String(err)}`)
        addLog(setLogs, "Error: Failed to verify Safe deployment", "error")
      } finally {
        setIsLoading(false)
      }
    }

    verifyDeployment()
  }, [chains.sourceChain, safeAccount.safeAddress])

  if (isLoading) {
    return <div>Verifying Safe deployment...</div>
  }

  if (error) {
    return (
      <div>
        <p className="text-red-500">{error}</p>
        <Button onClick={onPrev}>Go Back</Button>
      </div>
    )
  }

  const ExplorerLink = ({ type, value }: { type: "address" | "tx"; value: string }) => (
    <Link
      href={`${chains.sourceChain?.explorerUrl}/${type}/${value}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 hover:underline break-all"
    >
      {value}
    </Link>
  )

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Verification Results</h3>
      {isVerified && safeAccount.deploymentData ? (
        <div>
          <p className="text-green-500">Safe deployment verified successfully!</p>
          <h4 className="text-md font-semibold mt-4">Deployment Details:</h4>
          <p className="text-amber-500 mb-3 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
            <strong>Note:</strong> It is only possible to deploy a Safe with the same address on another network if you
            use exactly the same arguments that were used for the deployment of the existing Safe.
          </p>
          <div className="space-y-2">
            <p>
              Factory Address: <ExplorerLink type="address" value={safeAccount.deploymentData.factoryAddress} />
            </p>
            <p>
              Singleton Address: <ExplorerLink type="address" value={safeAccount.deploymentData.singleton} />
            </p>
            <p>
              Owners:{" "}
              {safeAccount.deploymentData.owners.map((owner: string, index: number) => (
                <span key={owner}>
                  {index > 0 && ", "}
                  <ExplorerLink type="address" value={owner} />
                </span>
              ))}
            </p>
            <p>Threshold: {safeAccount.deploymentData.threshold.toString()}</p>
            <p>
              Fallback Handler: <ExplorerLink type="address" value={safeAccount.deploymentData.fallbackHandler} />
            </p>
            <p>Salt Nonce: {safeAccount.deploymentData.saltNonce}</p>
            <p>
              Transaction Hash: <ExplorerLink type="tx" value={safeAccount.txHash} />
            </p>
          </div>
        </div>
      ) : (
        <p className="text-red-500">Failed to verify Safe deployment. Please check your inputs and try again.</p>
      )}
      <div className="flex justify-between">
        <Button onClick={onPrev}>Previous</Button>
        <Button onClick={onNext} disabled={!isVerified}>
          Next
        </Button>
      </div>
      <LogDisplay logs={logs} />
    </div>
  )
}

