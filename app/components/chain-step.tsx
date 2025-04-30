"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogDisplay } from "./log-display"
import { useSafeAccount } from "../context/safe-account-context"
import { useChains } from "../context/chains-context"
import {
  fetchChainInfo,
  verifySafeDeployment,
  getTransactionInfo,
  parseDeploymentTransaction,
} from "../utils/blockchain"
import { CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

interface ChainStepProps {
  onNext: () => void
}

const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

export function ChainStep({ onNext }: ChainStepProps) {
  const { safeAccount, setSafeAccount } = useSafeAccount()
  const { chains, setChains } = useChains()
  const [logs, setLogs] = useState<Array<{ message: string; type: "info" | "success" | "error"; timestamp: Date }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSafeValid, setIsSafeValid] = useState<boolean | null>(null)
  const [txInfo, setTxInfo] = useState<any>(null)
  const [validationComplete, setValidationComplete] = useState(false)

  const addLog = useCallback((message: string, type: "info" | "success" | "error" = "info") => {
    setLogs((prevLogs) => [...prevLogs, { message, type, timestamp: new Date() }])

    // If we see the success message for deployment data parsing, enable the Next button
    if (message === "Deployment transaction data parsed and validated successfully" && type === "success") {
      setValidationComplete(true)
    }
  }, [])

  const handleFetchChainInfo = useCallback(
    debounce(async (chainId: string) => {
      setIsLoading(true)
      addLog(`Fetching chain information for Chain ID: ${chainId}`, "info")
      try {
        const chainInfo = await fetchChainInfo(chainId)
        setChains((prev) => ({ ...prev, sourceChain: chainInfo }))
        addLog(`Chain information fetched successfully for ${chainInfo.name}`, "success")
      } catch (error) {
        addLog(`Failed to fetch chain information: ${error instanceof Error ? error.message : String(error)}`, "error")
        setChains((prev) => ({ ...prev, sourceChain: null }))
      } finally {
        setIsLoading(false)
      }
    }, 500),
    [addLog],
  )

  const validateSafeAddress = useCallback(
    async (address: string) => {
      if (!chains.sourceChain?.rpcUrls || chains.sourceChain.rpcUrls.length === 0) return

      setIsLoading(true)
      addLog(`Validating Safe address: ${address}`, "info")
      try {
        const isValid = await verifySafeDeployment(chains.sourceChain.rpcUrls, address)
        setIsSafeValid(isValid)
        addLog(isValid ? "Safe address is valid" : "Safe address is invalid", isValid ? "success" : "error")
      } catch (error) {
        addLog(`Failed to validate Safe address: ${error instanceof Error ? error.message : String(error)}`, "error")
        setIsSafeValid(null)
      } finally {
        setIsLoading(false)
      }
    },
    [chains.sourceChain?.rpcUrls, addLog],
  )

  const fetchTransactionInfo = useCallback(
    async (txHash: string) => {
      if (!chains.sourceChain?.rpcUrls || chains.sourceChain.rpcUrls.length === 0 || !safeAccount.safeAddress) return

      setIsLoading(true)
      setValidationComplete(false)
      addLog(`Fetching transaction information for hash: ${txHash}`, "info")
      try {
        const info = await getTransactionInfo(chains.sourceChain.rpcUrls, txHash)
        setTxInfo(info)
        addLog("Transaction information fetched successfully", "success")

        // Parse deployment transaction data
        const deploymentData = await parseDeploymentTransaction(chains.sourceChain.rpcUrls, txHash, addLog)

        // Validate if the Safe was deployed in this transaction
        if (
          deploymentData.safeAddress &&
          deploymentData.safeAddress.toLowerCase() !== safeAccount.safeAddress.toLowerCase()
        ) {
          throw new Error("The provided Safe address does not match the one deployed in this transaction")
        }

        setSafeAccount((prev) => ({
          ...prev,
          factoryAddress: deploymentData.factoryAddress,
          deploymentData: deploymentData,
        }))
        addLog("Deployment transaction data parsed and validated successfully", "success")
      } catch (error) {
        addLog(
          `Failed to fetch or validate transaction information: ${error instanceof Error ? error.message : String(error)}`,
          "error",
        )
        setTxInfo(null)
        setSafeAccount((prev) => ({ ...prev, factoryAddress: null, deploymentData: null }))
      } finally {
        setIsLoading(false)
      }
    },
    [chains.sourceChain?.rpcUrls, safeAccount.safeAddress, addLog, setSafeAccount],
  )

  useEffect(() => {
    if (safeAccount.safeAddress && chains.sourceChain?.rpcUrls) {
      validateSafeAddress(safeAccount.safeAddress)
    }
  }, [safeAccount.safeAddress, chains.sourceChain?.rpcUrls, validateSafeAddress])

  useEffect(() => {
    if (safeAccount.txHash && chains.sourceChain?.rpcUrls && safeAccount.safeAddress) {
      fetchTransactionInfo(safeAccount.txHash)
    }
  }, [safeAccount.txHash, chains.sourceChain?.rpcUrls, safeAccount.safeAddress, fetchTransactionInfo])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sourceChainId">Chain ID (source network)</Label>
        <div className="flex gap-2">
          <Input
            id="sourceChainId"
            value={chains.sourceChain?.chainId || ""}
            onChange={(e) => handleFetchChainInfo(e.target.value)}
            placeholder="e.g., 1 for Ethereum Mainnet"
            disabled={isLoading}
          />
        </div>
      </div>
      {chains.sourceChain && (
        <div className="bg-secondary p-4 rounded-md">
          <h3 className="font-semibold mb-2">Chain Information:</h3>
          <p>Name: {chains.sourceChain.name}</p>
          <p>Chain ID: {chains.sourceChain.chainId}</p>
          <p>
            Native Currency: {chains.sourceChain.nativeCurrency.name} ({chains.sourceChain.nativeCurrency.symbol})
          </p>
          <p>RPC Endpoints: {chains.sourceChain.rpcUrls.length} available</p>
          <p>Explorer URL: {chains.sourceChain.explorerUrl}</p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="safeAddress">Safe address</Label>
        <div className="flex items-center gap-2">
          <Input
            id="safeAddress"
            value={safeAccount.safeAddress}
            onChange={(e) => {
              setSafeAccount((prev) => ({ ...prev, safeAddress: e.target.value }))
              addLog(`Safe address set to: ${e.target.value}`)
            }}
            placeholder="0x..."
          />
          {isSafeValid !== null &&
            (isSafeValid ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />)}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="txHash">Safe deployment transaction hash</Label>
        <Input
          id="txHash"
          value={safeAccount.txHash}
          onChange={(e) => {
            setSafeAccount((prev) => ({ ...prev, txHash: e.target.value }))
            addLog(`Transaction hash set to: ${e.target.value}`)
            setValidationComplete(false)
          }}
          placeholder="0x..."
        />
        <p className="text-sm text-muted-foreground">
          Hint: You can find the transaction hash in the block explorer.
          {chains.sourceChain && safeAccount.safeAddress && (
            <>
              {" "}
              <Link
                href={`${chains.sourceChain.explorerUrl}/address/${safeAccount.safeAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                View Safe on block explorer
              </Link>
            </>
          )}
        </p>
      </div>
      {txInfo && (
        <div className="bg-secondary p-4 rounded-md">
          <h3 className="font-semibold mb-2">Transaction Information:</h3>
          <p>From: {txInfo.from}</p>
          <p>To: {txInfo.to}</p>
        </div>
      )}
      <Button onClick={onNext} disabled={isLoading || !validationComplete}>
        Next
      </Button>
      <LogDisplay logs={logs} />
    </div>
  )
}
