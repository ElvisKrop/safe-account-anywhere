"use client"

import { useState, useEffect } from "react"
import { APP_VERSION, fetchGitHubReleases, type VersionHistoryItem } from "../utils/version"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, ExternalLink, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getGitHubRepoUrl } from "../utils/package-info"

export function VersionDisplay() {
  const [open, setOpen] = useState(false)
  const [releases, setReleases] = useState<VersionHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get repo URL for "View all releases" link
  const repoUrl = getGitHubRepoUrl() || "https://github.com/ElvisKrop/safe-account-anywhere"

  useEffect(() => {
    // Only fetch releases when the dialog is opened
    if (open && releases.length === 0 && !isLoading) {
      setIsLoading(true)
      setError(null)

      fetchGitHubReleases()
        .then((data) => {
          setReleases(data)
        })
        .catch((err) => {
          console.error("Error fetching releases:", err)
          setError("Failed to load release information")
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [open, releases.length, isLoading])

  return (
    <div className="text-xs text-muted-foreground flex items-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center cursor-help">
              v{APP_VERSION} <Info className="h-3 w-3 ml-1" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click for version history</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 ml-1">
            Changelog
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading releases...</span>
            </div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">
              <p>{error}</p>
              <p className="text-sm mt-2">Using local version information instead.</p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              {releases.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No release information available.</p>
              ) : (
                releases.map((entry) => (
                  <div key={entry.version} className="mb-6 pb-4 border-b last:border-b-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center">
                        v{entry.version}
                        {entry.version === APP_VERSION && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-2 py-0.5 rounded-full">
                            current
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center">
                        <span className="text-sm font-normal text-muted-foreground mr-2">{entry.date}</span>
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                    {entry.changes.length > 0 ? (
                      <ul className="list-disc pl-5 mt-2">
                        {entry.changes.map((change, index) => (
                          <li key={index}>{change}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="italic text-muted-foreground mt-2">No detailed changelog available.</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          <div className="flex justify-end mt-2">
            <a
              href={`${repoUrl}/releases`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:text-blue-700 transition-colors flex items-center"
            >
              View all releases on GitHub
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
