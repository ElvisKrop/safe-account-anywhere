"use client"

import type React from "react"
import { createContext, useContext, useState, type ReactNode } from "react"

interface DeploymentData {
  factoryAddress: string
  singleton: string
  owners: string[]
  threshold: number
  fallbackHandler: string
  saltNonce: string
  hex: string
}

interface SafeAccountState {
  safeAddress: string
  txHash: string
  factoryAddress: string | null
  deploymentData: DeploymentData | null
}

interface SafeAccountContextType {
  safeAccount: SafeAccountState
  setSafeAccount: React.Dispatch<React.SetStateAction<SafeAccountState>>
}

const SafeAccountContext = createContext<SafeAccountContextType | undefined>(undefined)

export function SafeAccountProvider({ children }: { children: ReactNode }) {
  const [safeAccount, setSafeAccount] = useState<SafeAccountState>({
    safeAddress: "",
    txHash: "",
    factoryAddress: null,
    deploymentData: null,
  })

  return <SafeAccountContext.Provider value={{ safeAccount, setSafeAccount }}>{children}</SafeAccountContext.Provider>
}

export function useSafeAccount() {
  const context = useContext(SafeAccountContext)
  if (context === undefined) {
    throw new Error("useSafeAccount must be used within a SafeAccountProvider")
  }
  return context
}

