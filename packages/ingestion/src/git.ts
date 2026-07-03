// Ingestion Engine - Git Cloner
import fs from "fs/promises";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const asyncExec = promisify(exec);

export interface CloneResult {
  repoPath: string;
  defaultBranch: string;
  commitHash: string;
  commitMessage: string;
}

/** Parse various Git URL formats into owner/repo */
export function parseGitUrl(url: string): {
  type: "github" | "gitlab" | "bitbucket" | "generic";
  owner?: string;
  repo?: string;
  fullName?: string;
  cloneUrl: string;
} {
  // GitHub URLs
  const githubMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com[/:]([^/]+)\/([^/.]+)/
  );
  if (githubMatch) {
    return {
      type: "github",
      owner: githubMatch[1],
      repo: githubMatch[2],
      fullName: `${githubMatch[1]}/${githubMatch[2]}`,
      cloneUrl: `https://github.com/${githubMatch[1]}/${githubMatch[2]}.git`,
    };
  }

  // GitLab URLs
  const gitlabMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?gitlab\.com[/:]([^/]+)\/([^/.]+)/
  );
  if (gitlabMatch) {
    return {
      type: "gitlab",
      owner: gitlabMatch[1],
      repo: gitlabMatch[2],
      fullName: `${gitlabMatch[1]}/${gitlabMatch[2]}`,
      cloneUrl: `https://gitlab.com/${gitlabMatch[1]}/${gitlabMatch[2]}.git`,
    };
  }

  // Bitbucket URLs
  const bitbucketMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?bitbucket\.org[/:]([^/]+)\/([^/.]+)/
  );
  if (bitbucketMatch) {
    return {
      type: "bitbucket",
      owner: bitbucketMatch[1],
      repo: bitbucketMatch[2],
      fullName: `${bitbucketMatch[1]}/${bitbucketMatch[2]}`,
      cloneUrl: `https://bitbucket.org/${bitbucketMatch[1]}/${bitbucketMatch[2]}.git`,
    };
  }

  // Generic Git URL
  if (url.endsWith(".git") || url.includes("git@")) {
    return {
      type: "generic",
      cloneUrl: url,
    };
  }

  return {
    type: "generic",
    cloneUrl: url.endsWith(".git") ? url : `${url}.git`,
  };
}

/** Clone a repository using exec */
export async function cloneRepository(params: {
  url: string;
  branch?: string;
  depth?: number;
  authToken?: string;
}): Promise<CloneResult> {
  const { url, depth = 50, authToken } = params;

  const cloneDir = path.join(
    os.tmpdir(),
    "acre-repos",
    `repo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  await fs.mkdir(cloneDir, { recursive: true });

  try {
    let cloneUrl = url;
    if (authToken) {
      const parsed = parseGitUrl(url);
      if (parsed.type === "github" && parsed.fullName) {
        cloneUrl = `https://x-access-token:${authToken}@github.com/${parsed.fullName}.git`;
      }
    }

    // Clone the remote's default HEAD branch (no --branch flag to support
    // repos using main, master, or any other default branch name)
    await asyncExec(
      `git clone --depth ${depth} ${cloneUrl} ${cloneDir}`,
      {
        timeout: 120_000, // 2 min timeout
      }
    );

    const { stdout: rawHash } = await asyncExec(`git -C ${cloneDir} rev-parse HEAD`);
    const { stdout: rawMessage } = await asyncExec(`git -C ${cloneDir} log -1 --format=%s`);
    const { stdout: rawBranch } = await asyncExec(`git -C ${cloneDir} rev-parse --abbrev-ref HEAD`);
    const commitHash = rawHash.trim();
    const commitMessage = rawMessage.trim();
    const defaultBranch = rawBranch.trim();

    return {
      repoPath: cloneDir,
      defaultBranch,
      commitHash,
      commitMessage,
    };
  } catch (error: any) {
    await fs.rm(cloneDir, { recursive: true, force: true }).catch(() => {});
    throw new Error(`Failed to clone repository: ${error.message}`);
  }
}

export async function cleanupRepo(repoPath: string): Promise<void> {
  await fs.rm(repoPath, { recursive: true, force: true }).catch(() => {});
}
