"use client"

import type React from "react"

import { useState } from "react"
import { createPublicClient, http, type Address } from "viem"
import { mainnet } from "viem/chains"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ContractReadResult {
  success: boolean
  data?: any
  error?: string
}

export default function ContractReader() {
  const [formData, setFormData] = useState({
    rpcEndpoint: "",
    contractAddress: "",
    abi: "",
    functionSelector: "",
  })

  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ContractReadResult | null>(null)
  const [availableFunctions, setAvailableFunctions] = useState<string[]>([])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Parse available functions when ABI changes
    if (field === "abi") {
      parseAvailableFunctions(value)
      // Reset function selector when ABI changes
      setFormData((prev) => ({
        ...prev,
        abi: value,
        functionSelector: "",
      }))
    }

    // Clear previous results when form changes
    if (result) {
      setResult(null)
    }
  }

  const parseAvailableFunctions = (abiString: string) => {
    try {
      if (!abiString.trim()) {
        setAvailableFunctions([])
        return
      }

      const parsedAbi = JSON.parse(abiString)
      if (!Array.isArray(parsedAbi)) {
        setAvailableFunctions([])
        return
      }

      const readFunctions = parsedAbi
        .filter(
          (item: any) =>
            item.type === "function" && (item.stateMutability === "view" || item.stateMutability === "pure"),
        )
        .map((item: any) => item.name)
        .filter((name: string) => name) // Remove any undefined names

      setAvailableFunctions(readFunctions)
    } catch (error) {
      setAvailableFunctions([])
    }
  }

  const validateForm = () => {
    if (!formData.rpcEndpoint.trim()) {
      throw new Error("RPC endpoint is required")
    }

    if (!formData.contractAddress.trim()) {
      throw new Error("Contract address is required")
    }

    if (!formData.abi.trim()) {
      throw new Error("ABI is required")
    }

    if (!formData.functionSelector.trim()) {
      throw new Error("Function selector is required")
    }

    // Validate contract address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(formData.contractAddress)) {
      throw new Error("Invalid contract address format")
    }

    // Validate and parse ABI
    try {
      const parsedAbi = JSON.parse(formData.abi)
      if (!Array.isArray(parsedAbi)) {
        throw new Error("ABI must be a JSON array")
      }
      return parsedAbi
    } catch (e) {
      throw new Error("Invalid ABI JSON format")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)

    try {
      // Validate form inputs
      const parsedAbi = validateForm()

      // Create public client with the provided RPC endpoint
      const publicClient = createPublicClient({
        chain: mainnet, // You might want to make this configurable
        transport: http(formData.rpcEndpoint),
      })

      // Find the function in the ABI
      const targetFunction = parsedAbi.find(
        (item: any) => item.type === "function" && item.name === formData.functionSelector,
      )

      if (!targetFunction) {
        throw new Error(`Function "${formData.functionSelector}" not found in ABI`)
      }

      // Make the contract read call
      const contractResult = await publicClient.readContract({
        address: formData.contractAddress as Address,
        abi: parsedAbi,
        functionName: formData.functionSelector,
      })

      setResult({
        success: true,
        data: contractResult,
      })
    } catch (error: any) {
      console.error("Contract read error:", error)
      setResult({
        success: false,
        error: error.message || "An unexpected error occurred",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatResult = (data: any) => {
    if (typeof data === "bigint") {
      return data.toString()
    }
    if (typeof data === "object") {
      return JSON.stringify(data, (key, value) => (typeof value === "bigint" ? value.toString() : value), 2)
    }
    return String(data)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Smart Contract Reader</CardTitle>
            <CardDescription>Read data from smart contracts using RPC calls</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="rpc-endpoint">RPC Endpoint</Label>
                <Input
                  id="rpc-endpoint"
                  type="url"
                  placeholder="https://eth-mainnet.g.alchemy.com/v2/your-api-key"
                  value={formData.rpcEndpoint}
                  onChange={(e) => handleInputChange("rpcEndpoint", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract-address">Contract Address</Label>
                <Input
                  id="contract-address"
                  placeholder="0x..."
                  value={formData.contractAddress}
                  onChange={(e) => handleInputChange("contractAddress", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abi">Contract ABI (JSON)</Label>
                <Textarea
                  id="abi"
                  placeholder='[{"type":"function","name":"balanceOf","inputs":[{"name":"account","type":"address"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"}]'
                  value={formData.abi}
                  onChange={(e) => handleInputChange("abi", e.target.value)}
                  className="min-h-[120px] font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="function-selector">Function Name</Label>
                {availableFunctions.length > 0 ? (
                  <Select
                    value={formData.functionSelector}
                    onValueChange={(value) => handleInputChange("functionSelector", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a read function" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFunctions.map((functionName) => (
                        <SelectItem key={functionName} value={functionName}>
                          {functionName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 border rounded-md bg-gray-50 text-gray-500 text-sm">
                    {formData.abi.trim() ? "No read functions found in ABI" : "Enter ABI to see available functions"}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reading Contract...
                  </>
                ) : (
                  "Read Contract"
                )}
              </Button>
            </form>

            {result && (
              <div className="mt-6">
                <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  <div className="flex items-start gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h4 className={`font-medium ${result.success ? "text-green-800" : "text-red-800"}`}>
                        {result.success ? "Success" : "Error"}
                      </h4>
                      <AlertDescription className={result.success ? "text-green-700" : "text-red-700"}>
                        {result.success ? (
                          <div className="mt-2">
                            <p className="font-medium mb-2">Contract Response:</p>
                            <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
                              {formatResult(result.data)}
                            </pre>
                          </div>
                        ) : (
                          result.error
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
