import type { Workspace } from "@prisma/client";

import { decryptValue } from "../lib/encryption";

const IGNORED_PATH_SEGMENTS = ["node_modules/", "dist/", "build/", ".git/", "vendor/", ".next/", "coverage/"];
const MAX_FILE_PATHS = 400;

function buildGithubHeaders(workspace: Workspace): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "enriq",
  };

  if (workspace.githubTokenEncrypted) {
    headers.Authorization = `Bearer ${decryptValue(workspace.githubTokenEncrypted)}`;
  }

  return headers;
}

/** Fetches file paths from the default branch of the workspace's configured GitHub repo, for use as enrichment context. */
export async function getRepoFilePaths(workspace: Workspace): Promise<string[]> {
  if (!workspace.githubRepo) {
    return [];
  }

  const headers = buildGithubHeaders(workspace);

  try {
    const repoResponse = await fetch(`https://api.github.com/repos/${workspace.githubRepo}`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (!repoResponse.ok) {
      return [];
    }

    const repo = (await repoResponse.json()) as { default_branch: string };

    const treeResponse = await fetch(
      `https://api.github.com/repos/${workspace.githubRepo}/git/trees/${repo.default_branch}?recursive=1`,
      { headers, signal: AbortSignal.timeout(10000) },
    );

    if (!treeResponse.ok) {
      return [];
    }

    const tree = (await treeResponse.json()) as { tree: { path: string; type: string }[] };

    return tree.tree
      .filter((entry) => entry.type === "blob")
      .map((entry) => entry.path)
      .filter((path) => !IGNORED_PATH_SEGMENTS.some((segment) => path.includes(segment)))
      .slice(0, MAX_FILE_PATHS);
  } catch {
    return [];
  }
}

/**
 * Returns GitHub usernames of recent committers to the given file paths, ordered by how many
 * of those files they've touched most recently (most frequent first).
 */
export async function getRecentCommitters(workspace: Workspace, filePaths: string[]): Promise<string[]> {
  if (!workspace.githubRepo || filePaths.length === 0) {
    return [];
  }

  const headers = buildGithubHeaders(workspace);
  const counts = new Map<string, number>();

  for (const path of filePaths.slice(0, 5)) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${workspace.githubRepo}/commits?path=${encodeURIComponent(path)}&per_page=5`,
        { headers, signal: AbortSignal.timeout(5000) },
      );

      if (!response.ok) {
        continue;
      }

      const commits = (await response.json()) as { author: { login: string } | null }[];

      for (const commit of commits) {
        const login = commit.author?.login;
        if (login) {
          counts.set(login, (counts.get(login) ?? 0) + 1);
        }
      }
    } catch {
      continue;
    }
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([login]) => login);
}


export interface GithubStatus {
  configured: boolean;
  reachable: boolean;
  repoValid: boolean;
}

/** Checks whether the workspace's GitHub token (if any) is valid and the configured repo is reachable. */
export async function checkGithubStatus(workspace: Workspace): Promise<GithubStatus> {
  if (!workspace.githubRepo) {
    return { configured: false, reachable: false, repoValid: false };
  }

  const headers = buildGithubHeaders(workspace);

  try {
    if (workspace.githubTokenEncrypted) {
      const authResponse = await fetch("https://api.github.com/user", {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      if (!authResponse.ok) {
        return { configured: true, reachable: false, repoValid: false };
      }
    }

    const repoResponse = await fetch(`https://api.github.com/repos/${workspace.githubRepo}`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    return { configured: true, reachable: true, repoValid: repoResponse.ok };
  } catch {
    return { configured: true, reachable: false, repoValid: false };
  }
}
