/**
 * Application version information
 * Using version from package.json and releases from GitHub
 */

// Import package info from our utility instead of directly from package.json
import { packageVersion, parseGitHubRepo } from "./package-info"

export const APP_VERSION = packageVersion

// Get repository information
const repoInfo = parseGitHubRepo()
const GITHUB_OWNER = repoInfo.owner
const GITHUB_REPO = repoInfo.repo
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`

// Interface for GitHub release
export interface GitHubRelease {
  tag_name: string
  name: string
  published_at: string
  body: string
  html_url: string
}

// Interface for formatted version history
export interface VersionHistoryItem {
  version: string
  date: string
  changes: string[]
  url: string
}

// Cache for GitHub releases
let releasesCache: VersionHistoryItem[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

// Parse release body to extract changes
function parseReleaseBody(body: string): string[] {
  // GitHub release bodies are often in Markdown with lists
  // This simple parser extracts bullet points and numbered lists
  const changes: string[] = []

  if (!body) return changes

  // Split by lines and process each line
  const lines = body.split("\n")

  for (const line of lines) {
    // Match Markdown list items (both bullet points and numbered lists)
    const trimmedLine = line.trim()
    if (trimmedLine.match(/^[*\-+]|^\d+\.\s/)) {
      // Remove the list marker and trim
      const change = trimmedLine.replace(/^[*\-+]|^\d+\.\s/, "").trim()
      if (change) {
        changes.push(change)
      }
    }
  }

  // If no list items were found, use the first paragraph or the whole body
  if (changes.length === 0 && body.trim()) {
    // Use the first paragraph or the whole body if it's short
    const firstParagraph = body.split("\n\n")[0].trim()
    changes.push(firstParagraph || body.trim())
  }

  return changes
}

// Format date to YYYY-MM-DD
function formatDate(dateString: string): string {
  return new Date(dateString).toISOString().split("T")[0]
}

// Fetch releases from GitHub
export async function fetchGitHubReleases(): Promise<VersionHistoryItem[]> {
  const now = Date.now()

  // Return cached data if it's still valid
  if (releasesCache && now - lastFetchTime < CACHE_DURATION) {
    return releasesCache
  }

  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
      // Use cache: 'no-store' for production to ensure fresh data
      // Use cache: 'force-cache' for development to avoid rate limits
      cache: process.env.NODE_ENV === "production" ? "no-store" : "force-cache",
      next: { revalidate: 3600 }, // Revalidate every hour
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const releases: GitHubRelease[] = await response.json()

    // Format releases
    const formattedReleases = releases.map((release) => ({
      version: release.tag_name.replace(/^v/, ""), // Remove 'v' prefix if present
      date: formatDate(release.published_at),
      changes: parseReleaseBody(release.body),
      url: release.html_url,
    }))

    // Update cache
    releasesCache = formattedReleases
    lastFetchTime = now

    return formattedReleases
  } catch (error) {
    console.error("Error fetching GitHub releases:", error)

    // Return a fallback version if we can't fetch from GitHub
    return [
      {
        version: APP_VERSION,
        date: new Date().toISOString().split("T")[0],
        changes: ["Current version"],
        url: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`,
      },
    ]
  }
}

// Get the latest version information
export async function getVersionInfo() {
  const releases = await fetchGitHubReleases()
  const currentVersionRelease = releases.find((r) => r.version === APP_VERSION) || releases[0]

  return {
    version: APP_VERSION,
    latestChanges: currentVersionRelease?.changes || [],
    releaseUrl: currentVersionRelease?.url,
  }
}
