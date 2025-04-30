"use client"

import type React from "react"
import { createContext, useContext, useState, type ReactNode } from "react"

interface ChainInfo {
  chainId: string
  name: string
  rpcUrl: string
  explorerUrl: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

interface SafeDeploymentState {
  sourceChain: ChainInfo | null
  targetChain: ChainInfo | null
  safeAddress: string
  txHash: string
  factoryAddress: string | null
}

interface SafeDeploymentContextType {
  state: SafeDeploymentState
  setState: React.Dispatch<React.SetStateAction<SafeDeploymentState>>
}

const SafeDeploymentContext = createContext<SafeDeploymentContextType | undefined>(undefined)

export function SafeDeploymentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SafeDeploymentState>({
    sourceChain: null,
    targetChain: null,
    safeAddress: "",
    txHash: "",
    factoryAddress: null,
  })

  return <SafeDeploymentContext.Provider value={{ state, setState }}>{children}</SafeDeploymentContext.Provider>
}

export function useSafeDeployment() {
  const context = useContext(SafeDeploymentContext)
  if (context === undefined) {
    throw new Error("useSafeDeployment must be used within a SafeDeploymentProvider")
  }
  return context
}
