/**
 * Utility to safely access package.json information
 * This avoids direct imports from package.json which can cause build errors
 */

// Import the entire package.json as a module
import packageJson from "../../package.json"

// Export the specific properties we need
export const packageVersion = packageJson.version || "0.0.0"

// Parse repository information
export const repositoryInfo = (() => {
  try {
    if (typeof packageJson.repository === "string") {
      return { url: packageJson.repository }
    } else if (packageJson.repository && typeof packageJson.repository === "object") {
      return {
        url: packageJson.repository.url || "",
        type: packageJson.repository.type || "git",
      }
    }
    return { url: "" }
  } catch (e) {
    console.error("Error parsing repository info from package.json", e)
    return { url: "" }
  }
})()

// Helper function to get GitHub repo URL in a consistent format
export function getGitHubRepoUrl(): string {
  const repoUrl = repositoryInfo.url
  if (!repoUrl) return ""

  return repoUrl
    .replace(/^git\+/, "")
    .replace(/\.git$/, "")
    .replace("git@github.com:", "https://github.com/")
}

// Parse GitHub repository information from package.json
export function parseGitHubRepo(): { owner: string; repo: string } {
  let owner = ""
  let repo = ""
  const repoUrl = repositoryInfo.url

  try {
    if (!repoUrl) {
      throw new Error("No repository URL found in package.json")
    }

    // Handle different URL formats
    // Format: https://github.com/owner/repo.git or git+https://github.com/owner/repo.git
    if (repoUrl.includes("github.com/")) {
      const urlParts = repoUrl
        .replace(/\.git$/, "") // Remove .git suffix if present
        .replace(/^git\+/, "") // Remove git+ prefix if present
        .split("github.com/")[1]
        .split("/")

      owner = urlParts[0]
      repo = urlParts[1]
    }
    // Format: git@github.com:owner/repo.git
    else if (repoUrl.includes("github.com:")) {
      const urlParts = repoUrl
        .replace(/\.git$/, "") // Remove .git suffix if present
        .split("github.com:")[1]
        .split("/")

      owner = urlParts[0]
      repo = urlParts[1]
    }

    if (!owner || !repo) {
      throw new Error("Could not parse GitHub repository information")
    }

    return { owner, repo }
  } catch (error) {
    console.error("Error parsing GitHub repository URL:", error)
    // Fallback to default values if parsing fails
    return { owner: "ElvisKrop", repo: "safe-account-anywhere" }
  }
}
