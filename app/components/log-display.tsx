"use client"

import { useEffect, useRef } from "react"

interface LogEntry {
  message: string
  type: "info" | "success" | "error"
  timestamp: Date
}

interface LogDisplayProps {
  logs: LogEntry[]
}

export function LogDisplay({ logs }: LogDisplayProps) {
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logEndRef]) //Fixed dependency

  return (
    <div className="mt-4 p-2 bg-gray-100 rounded-md h-40 overflow-y-auto">
      {logs.map((log, index) => (
        <div
          key={index}
          className={`mb-1 ${log.type === "error" ? "text-red-500" : log.type === "success" ? "text-green-500" : "text-gray-700"}`}
        >
          [{log.timestamp.toLocaleTimeString()}] {log.message}
        </div>
      ))}
      <div ref={logEndRef} />
    </div>
  )
}

