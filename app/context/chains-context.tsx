"use client"

import type React from "react"
import { createContext, useContext, useState, type ReactNode } from "react"

interface ChainInfo {
  chainId: string
  name: string
  rpcUrls: string[] // Changed from rpcUrl: string to rpcUrls: string[]
  explorerUrl: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

interface ChainsState {
  sourceChain: ChainInfo | null
  targetChain: ChainInfo | null
}

interface ChainsContextType {
  chains: ChainsState
  setChains: React.Dispatch<React.SetStateAction<ChainsState>>
}

const ChainsContext = createContext<ChainsContextType | undefined>(undefined)

export function ChainsProvider({ children }: { children: ReactNode }) {
  const [chains, setChains] = useState<ChainsState>({
    sourceChain: null,
    targetChain: null,
  })

  return <ChainsContext.Provider value={{ chains, setChains }}>{children}</ChainsContext.Provider>
}

export function useChains() {
  const context = useContext(ChainsContext)
  if (context === undefined) {
    throw new Error("useChains must be used within a ChainsProvider")
  }
  return context
}

