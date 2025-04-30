"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChainStep } from "./components/chain-step"
import { VerificationStep } from "./components/verification-step"
import { TargetChainStep } from "./components/target-chain-step"
import { DeploymentStep } from "./components/deployment-step"
import { SafeAccountProvider } from "./context/safe-account-context"
import { ChainsProvider } from "./context/chains-context"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export default function SafeDeployment() {
  const [step, setStep] = useState(1)

  useEffect(() => {
    console.log("SafeDeployment rendering, current step:", step)
  }, [step])

  const handleNextStep = () => {
    if (step < 4) {
      setStep(step + 1)
    }
  }

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  return (
    <SafeAccountProvider>
      <ChainsProvider>
        <div className="container mx-auto p-4">
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Deploy Safe on Different Chain</CardTitle>
              <CardDescription>Follow the steps to deploy your existing Safe account on a new chain.</CardDescription>
            </CardHeader>
            <CardContent>
              {step === 1 && <ChainStep onNext={handleNextStep} />}
              {step === 2 && (
                <ErrorBoundary fallback={<ErrorFallback onReset={() => setStep(1)} />}>
                  <VerificationStep onNext={handleNextStep} onPrev={handlePrevStep} />
                </ErrorBoundary>
              )}
              {step === 3 && <TargetChainStep onNext={handleNextStep} onPrev={handlePrevStep} />}
              {step === 4 && <DeploymentStep onPrev={handlePrevStep} />}
            </CardContent>
          </Card>
        </div>
      </ChainsProvider>
    </SafeAccountProvider>
  )
}

function ErrorBoundary({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("Caught error:", error)
      setHasError(true)
    }

    window.addEventListener("error", handleError)
    return () => window.removeEventListener("error", handleError)
  }, [])

  if (hasError) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

function ErrorFallback({ onReset }: { onReset: () => void }) {
  return (
    <div className="text-center">
      <h2 className="text-lg font-semibold mb-2">Oops! Something went wrong.</h2>
      <p className="mb-4">We encountered an error while loading this step.</p>
      <Button onClick={onReset}>Go back to the first step</Button>
    </div>
  )
}

