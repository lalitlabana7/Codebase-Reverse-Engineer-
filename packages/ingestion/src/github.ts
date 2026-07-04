// Ingestion Engine - GitHub API Client
export class GitHubClient {
  private token: string;
  private baseUrl = "https://api.github.com";

  constructor(token?: string) {
    this.token = token ?? "";
  }

  private async request<T>(path: string): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "acre-analyzer",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  /** Fetch repository metadata */
  async getRepo(fullName: string): Promise<GitHubRepo> {
    return this.request<GitHubRepo>(`/repos/${fullName}`);
  }

  /** Fetch repository file tree (recursive) */
  async getTree(fullName: string, branch = "main"): Promise<GitTreeItem[]> {
    const data = await this.request<{ tree: GitTreeItem[] }>(
      `/repos/${fullName}/git/trees/${branch}?recursive=1`
    );
    return data.tree;
  }

  /** Fetch file content via Contents API */
  async getFileContent(fullName: string, path: string): Promise<string | null> {
    try {
      const data = await this.request<{ content: string; encoding: string }>(
        `/repos/${fullName}/contents/${path}`
      );
      if (data.encoding === "base64") {
        return Buffer.from(data.content, "base64").toString("utf-8");
      }
      return data.content;
    } catch {
      return null;
    }
  }

  /** Get README content */
  async getReadme(fullName: string): Promise<string | null> {
    try {
      const data = await this.request<{ content: string }>(
        `/repos/${fullName}/readme`
      );
      return Buffer.from(data.content, "base64").toString("utf-8");
    } catch {
      return null;
    }
  }

  /**
   * Fetch contents of all source files in a repository via the Git Trees + Blobs API.
   * This avoids needing to git clone anything — fully compatible with serverless.
   *
   * Steps:
   *  1. GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1  →  all paths + SHAs
   *  2. For each blob file, GET /repos/{owner}/{repo}/git/blobs/{sha}  →  base64 content
   *
   * Performance:
   *  - Tree call is fast (returns metadata only)
   *  - Blob calls are made in parallel (maxConcurrency at a time)
   *  - maxFiles limits how many files we fetch (respects Vercel 10s timeout)
   */
  async getRepoContents(
    fullName: string,
    options?: { branch?: string; maxFiles?: number }
  ): Promise<{ files: ScannedAPIFile[]; fileCount: number; totalSize: number; directoryCount: number }> {
    const branch = options?.branch ?? "main";
    const maxFiles = options?.maxFiles ?? 150;

    const tree = await this.getTree(fullName, branch);

    // Filter to blob (file) items, excluding large files and non-source paths
    const SKIP_PATTERNS = [
      "node_modules/", ".git/", "dist/", "build/", ".next/",
      "__pycache__/", "venv/", ".venv/", "target/", "vendor/",
      ".gradle/", "coverage/", ".turbo/",
    ];

    const blobs = tree.filter(
      (item) =>
        item.type === "blob" &&
        item.size != null &&
        item.size > 0 &&
        item.size <= 1_000_000 &&
        !SKIP_PATTERNS.some((p) => item.path.startsWith(p)) &&
        !/\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|otf|pdf|zip|tar|gz|mp4|mp3|avi|exe|dll|so|dylib|bin|lock|map)$/i.test(item.path) &&
        !/^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Gemfile\.lock)$/i.test(item.path.split("/").pop() ?? "")
    );

    // Take the first N files
    const selectedBlobs = blobs.slice(0, maxFiles);

    // Fetch content in parallel with concurrency limit
    const contents = await this.fetchFilesWithConcurrency(fullName, selectedBlobs, 5);

    const files: ScannedAPIFile[] = contents.filter(Boolean) as ScannedAPIFile[];
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    // Count directories (unique parent paths)
    const dirs = new Set<string>();
    for (const f of files) {
      const parts = f.relativePath.split("/");
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join("/"));
      }
    }

    return {
      files,
      fileCount: files.length,
      totalSize,
      directoryCount: dirs.size,
    };
  }

  private async fetchFilesWithConcurrency(
    fullName: string,
    blobs: GitTreeItem[],
    concurrency: number
  ): Promise<(ScannedAPIFile | null)[]> {
    const results: (ScannedAPIFile | null)[] = new Array(blobs.length).fill(null);
    let index = 0;

    const worker = async () => {
      while (index < blobs.length) {
        const i = index++;
        const blob = blobs[i]!;
        try {
          const data = await this.request<{ content: string; encoding: string }>(
            `/repos/${fullName}/git/blobs/${blob.sha}`
          );
          if (data.encoding === "base64") {
            const content = Buffer.from(data.content, "base64").toString("utf-8");
            results[i] = {
              relativePath: blob.path,
              content,
              size: blob.size ?? content.length,
              language: detectLanguageFromPath(blob.path),
            };
          }
        } catch {
          // Skip files that fail to fetch
        }
      }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return results;
  }
}

function detectLanguageFromPath(filePath: string): string | null {
  const EXTENSION_LANG: Record<string, string> = {
    ts: "TypeScript", tsx: "TypeScript React", js: "JavaScript", jsx: "JavaScript React",
    mjs: "JavaScript", cjs: "JavaScript", py: "Python", rb: "Ruby", go: "Go", rs: "Rust",
    java: "Java", kt: "Kotlin", swift: "Swift", php: "PHP", cs: "C#", cpp: "C++", c: "C",
    h: "C/C++ Header", hpp: "C++ Header", scala: "Scala", vue: "Vue", svelte: "Svelte",
    css: "CSS", scss: "SCSS", less: "Less", html: "HTML", xml: "XML", yaml: "YAML",
    yml: "YAML", json: "JSON", md: "Markdown", mdx: "MDX", sql: "SQL", sh: "Shell",
    bash: "Shell", tf: "Terraform", toml: "TOML", env: "Dotenv",
  };
  const name = filePath.toLowerCase().split("/").pop() ?? "";
  if (name === "dockerfile") return "Dockerfile";
  if (name === "makefile") return "Makefile";
  const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
  return EXTENSION_LANG[ext] ?? null;
}

export interface ScannedAPIFile {
  relativePath: string;
  content: string;
  size: number;
  language: string | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  private: boolean;
  size: number;
  owner: { login: string; avatar_url: string };
}

export interface GitTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}
