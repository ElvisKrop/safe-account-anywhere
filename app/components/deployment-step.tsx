"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useWallet, checkWalletBalance, deploySafe, getCurrentNetwork } from "../utils/wallet"
import { fetchChainInfo } from "../utils/chainInfo"
import { useSafeAccount } from "../context/safe-account-context"
import { useChains } from "../context/chains-context"
import { formatEther } from "viem"
import { LogDisplay } from "./log-display"
import { useSetChain } from "@web3-onboard/react"
import Link from "next/link"

interface DeploymentStepProps {
  onPrev: () => void
}

export function DeploymentStep({ onPrev }: DeploymentStepProps) {
  const [, setChain] = useSetChain()
  const { safeAccount, setSafeAccount } = useSafeAccount()
  const { chains } = useChains()
  const [{ wallet, connecting }, connect] = useWallet()
  const [isBalanceSufficient, setIsBalanceSufficient] = useState(false)
  const [currentNetwork, setCurrentNetwork] = useState<{ chainId: string; name: string } | null>(null)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [logs, setLogs] = useState<Array<{ message: string; type: "info" | "success" | "error"; timestamp: Date }>>([])
  const [deploymentTxHash, setDeploymentTxHash] = useState<string | null>(null)
  const [newSafeAddress, setNewSafeAddress] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const getNetwork = async () => {
      if (wallet?.provider) {
        try {
          const network = await getCurrentNetwork(wallet.provider)
          setCurrentNetwork(network)
        } catch (error) {
          console.error("Error fetching network:", error)
        }
      }
    }

    getNetwork()

    if (wallet?.provider) {
      const provider = wallet.provider

      // Listen for network changes
      const handleChainChanged = async (newChainId: string) => {
        const chainInfo = await fetchChainInfo(Number.parseInt(newChainId, 16).toString())
        setCurrentNetwork({
          chainId: newChainId,
          name: chainInfo.name,
        })
      }

      provider.on("chainChanged", handleChainChanged)

      // Cleanup event listener on unmount
      return () => {
        provider.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [wallet])

  const addLog = useCallback((message: string, type: "info" | "success" | "error" = "info") => {
    setLogs((prevLogs) => [...prevLogs, { message, type, timestamp: new Date() }])
  }, [])

  const checkWalletStatus = useCallback(async () => {
    if (wallet && chains.targetChain) {
      try {
        setIsLoading(true)
        const network = await getCurrentNetwork(wallet.provider)
        setCurrentNetwork(network)
        setIsCorrectNetwork(network.chainId === `0x${Number.parseInt(chains.targetChain.chainId).toString(16)}`)

        if (network.chainId === `0x${Number.parseInt(chains.targetChain.chainId).toString(16)}`) {
          const balanceWei = await checkWalletBalance(wallet.accounts[0].address, chains.targetChain.chainId)
          const balanceFormatted = formatEther(balanceWei)
          setBalance(balanceFormatted)
          setIsBalanceSufficient(balanceWei > 0n) // You may want to set a minimum required balance
        } else {
          setBalance(null)
          setIsBalanceSufficient(false)
        }
      } catch (err) {
        console.error("Error checking wallet status:", err)
        if (err instanceof Error) {
          setError(`Failed to check wallet status: ${err.message}`)
        } else {
          setError("Failed to check wallet status. Please try reconnecting your wallet.")
        }
      } finally {
        setIsLoading(false)
      }
    }
  }, [wallet, chains.targetChain])

  useEffect(() => {
    checkWalletStatus()
  }, [checkWalletStatus])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkWalletStatus()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [checkWalletStatus])

  useEffect(() => {
    setCurrentNetwork(null)
    return () => {
      setIsBalanceSufficient(false)
      setCurrentNetwork(null)
      setIsCorrectNetwork(false)
      setBalance(null)
      setError(null)
    }
  }, [])

  const handleConnectWallet = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await connect()
    } catch (err) {
      setError("Failed to connect wallet. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwitchNetwork = async () => {
    if (!chains.targetChain) return

    try {
      setIsLoading(true)
      setError(null)
      const result = await setChain({
        chainId: `0x${Number.parseInt(chains.targetChain.chainId).toString(16)}`,
      })

      if (result) {
        console.log("Network switched successfully")
      } else {
        console.log("User rejected network switch or an error occurred")
      }

      // Wait for the network to actually change
      const checkNetworkChange = async () => {
        const network = await getCurrentNetwork(wallet!.provider)
        if (network.chainId === `0x${Number.parseInt(chains.targetChain!.chainId).toString(16)}`) {
          await checkWalletStatus()
          return
        }
        // If the network hasn't changed yet, check again after a short delay
        setTimeout(checkNetworkChange, 1000)
      }

      checkNetworkChange()
    } catch (err) {
      console.error("Error switching network:", err)
      setError("Failed to switch network. Please try again or switch manually in your wallet.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeploySafe = async () => {
    if (!wallet || !chains.targetChain || !safeAccount.deploymentData) return

    try {
      setIsLoading(true)
      setError(null)
      const { txHash, safeAddress } = await deploySafe(
        wallet.provider,
        chains.targetChain.chainId,
        safeAccount.deploymentData.factoryAddress,
        safeAccount.deploymentData.hex,
        addLog,
      )
      setDeploymentTxHash(txHash)
      setNewSafeAddress(safeAddress)
      setSafeAccount((prev) => ({
        ...prev,
        safeAddress: safeAddress,
        txHash: txHash,
      }))
      toast({
        title: "Safe Deployed Successfully",
        description: `Your Safe has been deployed on the target chain at address: ${safeAddress}`,
      })
    } catch (err) {
      console.error("Error deploying Safe:", err)
      setError("Failed to deploy Safe. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Deploy Safe on Target Chain</h3>
      {chains.targetChain && (
        <div className="bg-secondary p-4 rounded-md mb-4">
          <h4 className="text-md font-semibold mb-2">Target Chain Information:</h4>
          <p>Name: {chains.targetChain.name}</p>
          <p>Chain ID: {chains.targetChain.chainId}</p>
          <p>
            Native Currency: {chains.targetChain.nativeCurrency.name} ({chains.targetChain.nativeCurrency.symbol})
          </p>
          <p>RPC Endpoints: {chains.targetChain.rpcUrls.length} available</p>
          <p>Explorer URL: {chains.targetChain.explorerUrl}</p>
        </div>
      )}
      <div className="flex justify-between items-center">
        <Button onClick={onPrev} disabled={isLoading}>
          Previous
        </Button>
        {!wallet && (
          <Button onClick={handleConnectWallet} disabled={connecting || isLoading}>
            {connecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        )}
      </div>
      {wallet && (
        <div className="space-y-2">
          <p>Wallet connected: {wallet.accounts[0].address}</p>
          {currentNetwork && (
            <p>
              Current network: {currentNetwork.name} (Chain ID: {currentNetwork.chainId})
            </p>
          )}
          {!isCorrectNetwork && (
            <div>
              <p className="text-yellow-500">Your wallet is not connected to the correct network.</p>
              <Button onClick={handleSwitchNetwork} disabled={isLoading}>
                Switch to Target Network
              </Button>
            </div>
          )}
          {isCorrectNetwork && (
            <>
              <p>Balance: {balance ? `${balance} ${chains.targetChain?.nativeCurrency.symbol}` : "Loading..."}</p>
              <p>Balance sufficient: {isBalanceSufficient ? "Yes" : "No"}</p>
              <Button onClick={handleDeploySafe} disabled={!isBalanceSufficient || isLoading}>
                {isLoading ? "Deploying..." : "Deploy Safe"}
              </Button>
            </>
          )}
        </div>
      )}
      {error && <p className="text-red-500">{error}</p>}
      {deploymentTxHash && newSafeAddress && chains.targetChain && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Safe Deployed Successfully!</strong>
          <p className="block sm:inline">
            New Safe Address:{" "}
            <Link
              href={`${chains.targetChain.explorerUrl}/address/${newSafeAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {newSafeAddress}
            </Link>
          </p>
          <p className="block sm:inline">
            Deployment Transaction:{" "}
            <Link
              href={`${chains.targetChain.explorerUrl}/tx/${deploymentTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {deploymentTxHash}
            </Link>
          </p>
        </div>
      )}
      <LogDisplay logs={logs} />
    </div>
  )
}
