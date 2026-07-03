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

  /** Fetch file content */
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
