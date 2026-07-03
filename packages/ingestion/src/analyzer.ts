// Ingestion Engine - Repository Analyzer
// Orchestrates the full analysis pipeline for a repository

import { scanDirectory, type ScanResult, type ScannedFile } from "./scanner";
import { parseDependencies, type ParsedDependency } from "./deps";
import { chunkFile, estimateTokens, type CodeChunk } from "./chunker";
import { cloneRepository, cleanupRepo, parseGitUrl, type CloneResult } from "./git";
import { GitHubClient, type GitHubRepo } from "./github";
import fs from "fs/promises";
import path from "path";

export interface AnalysisInput {
  url: string;
  branch?: string;
  githubToken?: string;
}

export interface AnalysisOutput {
  repository: {
    name: string;
    fullName: string | null;
    description: string | null;
    defaultBranch: string;
    language: string | null;
    topics: string[];
    stars: number;
    isPrivate: boolean;
    size: number;
    url: string;
  };
  scan: ScanResult;
  dependencies: ParsedDependency[];
  chunks: CodeChunk[];
  folderStructure: FolderEntry[];
  technologies: TechDetection[];
  importantFiles: ImportantFile[];
  summary: {
    purpose: string;
    projectType: string;
    techStack: string[];
    architecture: string[];
    fileCount: number;
    dependencyCount: number;
  };
}

export interface FolderEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  language?: string;
  children?: FolderEntry[];
}

export interface TechDetection {
  name: string;
  category: "language" | "framework" | "library" | "tool" | "database" | "infrastructure";
  confidence: number;
  evidence?: string;
}

export interface ImportantFile {
  path: string;
  name: string;
  purpose: string;
  isEntryPoint: boolean;
  isConfig: boolean;
}

const ENTRY_POINT_FILES = new Set([
  "index.ts", "index.js", "index.tsx", "index.jsx",
  "main.ts", "main.js", "main.py", "main.go", "main.rs",
  "app.ts", "app.js", "app.py", "server.ts", "server.js",
  "cli.ts", "cli.js", "cli.py",
  "__init__.py", "manage.py", "setup.py",
]);

const CONFIG_FILES = new Set([
  "package.json", "tsconfig.json", "next.config.js", "next.config.ts",
  "tailwind.config.js", "tailwind.config.ts", "vite.config.ts", "vite.config.js",
  "webpack.config.js", ".eslintrc.js", ".eslintrc.json", ".prettierrc",
  "jest.config.js", "jest.config.ts", "docker-compose.yml", "docker-compose.yaml",
  "Dockerfile", ".github/workflows", ".gitlab-ci.yml", "Makefile",
  "Cargo.toml", "go.mod", "build.gradle", "pom.xml",
]);

export async function analyzeRepository(input: AnalysisInput): Promise<AnalysisOutput> {
  const parsed = parseGitUrl(input.url);
  let cloneResult: CloneResult | null = null;
  let repoData: GitHubRepo | null = null;

  // Fetch GitHub metadata if it's a GitHub repo
  if (parsed.type === "github" && parsed.fullName) {
    try {
      const github = new GitHubClient(input.githubToken);
      repoData = await github.getRepo(parsed.fullName);
    } catch {
      // Continue without GitHub metadata
    }
  }

  // Clone the repository
  try {
    cloneResult = await cloneRepository({
      url: input.url,
      branch: input.branch ?? repoData?.default_branch ?? "main",
      depth: 50, // Shallow clone for speed
      authToken: input.githubToken,
    });
  } catch (error: any) {
    throw new Error(`Failed to clone repository: ${error.message}`);
  }

  try {
    // Scan the file system
    const scan = await scanDirectory(cloneResult.repoPath);
    const dependencies: ParsedDependency[] = [];
    const chunks: CodeChunk[] = [];

    // Process each file
    for (const file of scan.files) {
      // Parse dependencies from manifest files
      const deps = parseDependencies(file.relativePath, file.content);
      if (deps) {
        dependencies.push(...deps.dependencies);
      }

      // Chunk source code files for embedding
      const isSource = file.language && !["JSON", "YAML", "XML", "Markdown", "CSS"].includes(file.language);
      if (isSource && file.content.length > 0) {
        const fileChunks = chunkFile(file.content, file.relativePath, file.language);
        chunks.push(...fileChunks);
      }
    }

    // Build folder structure tree
    const folderStructure = buildFolderTree(scan.files);

    // Detect technologies
    const technologies = detectTechnologies(scan, dependencies);

    // Find important files
    const importantFiles = findImportantFiles(scan.files);

    // Generate summary
    const summary = {
      purpose: await generatePurpose(scan, repoData),
      projectType: detectProjectType(scan, dependencies),
      techStack: technologies.map(t => t.name),
      architecture: detectArchitecturePatterns(scan, dependencies),
      fileCount: scan.fileCount,
      dependencyCount: dependencies.length,
    };

    return {
      repository: {
        name: repoData?.name ?? parsed.repo ?? "unknown",
        fullName: repoData?.full_name ?? parsed.fullName ?? null,
        description: repoData?.description ?? null,
        defaultBranch: cloneResult.defaultBranch,
        language: repoData?.language ?? null,
        topics: repoData?.topics ?? [],
        stars: repoData?.stargazers_count ?? 0,
        isPrivate: repoData?.private ?? false,
        size: scan.totalSize,
        url: input.url,
      },
      scan,
      dependencies,
      chunks,
      folderStructure,
      technologies,
      importantFiles,
      summary,
    };
  } finally {
    // Clean up cloned repo
    if (cloneResult) {
      await cleanupRepo(cloneResult.repoPath);
    }
  }
}

function buildFolderTree(files: Array<{ relativePath: string; size: number; language: string | null }>): FolderEntry[] {
  const root: FolderEntry[] = [];

  for (const file of files) {
    const parts = file.relativePath.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isLast = i === parts.length - 1;

      if (isLast) {
        // File
        current.push({
          name: part,
          path: file.relativePath,
          type: "file",
          size: file.size,
          language: file.language ?? undefined,
        });
      } else {
        // Directory - find or create
        let dir = current.find((e) => e.name === part && e.type === "directory") as FolderEntry | undefined;
        if (!dir) {
          dir = { name: part, path: parts.slice(0, i + 1).join("/"), type: "directory", children: [] };
          current.push(dir);
        }
        current = dir.children!;
      }
    }
  }

  return root;
}

function detectTechnologies(
  scan: ScanResult,
  dependencies: ParsedDependency[]
): TechDetection[] {
  const techs: TechDetection[] = [];

  // Detect languages
  for (const [lang, count] of scan.languages) {
    if (count > 0) {
      techs.push({
        name: lang,
        category: "language",
        confidence: Math.min(1, count / 10),
      });
    }
  }

  // Detect frameworks from dependencies
  const frameworkKeywords: Record<string, { name: string; deps: string[] }> = {
    "Next.js": { name: "Next.js", deps: ["next"] },
    React: { name: "React", deps: ["react", "react-dom"] },
    Vue: { name: "Vue.js", deps: ["vue"] },
    Angular: { name: "Angular", deps: ["@angular/core"] },
    Express: { name: "Express", deps: ["express"] },
    Django: { name: "Django", deps: ["django"] },
    Flask: { name: "Flask", deps: ["flask"] },
    Spring: { name: "Spring", deps: ["spring-boot"] },
    Rails: { name: "Ruby on Rails", deps: ["rails"] },
    "Tailwind CSS": { name: "Tailwind CSS", deps: ["tailwindcss"] },
    Prisma: { name: "Prisma", deps: ["@prisma/client", "prisma"] },
    "TypeORM": { name: "TypeORM", deps: ["typeorm"] },
  };

  const depNames = new Set(dependencies.map((d) => d.name));
  for (const [, framework] of Object.entries(frameworkKeywords)) {
    if (framework.deps.some((d) => depNames.has(d))) {
      techs.push({
        name: framework.name,
        category: "framework",
        confidence: 0.9,
      });
    }
  }

  // Detect databases
  const dbKeywords = ["postgresql", "mongodb", "mysql", "redis", "sqlite", "prisma", "mongoose", "pg"];
  for (const dep of dependencies) {
    if (dbKeywords.some((kw) => dep.name.toLowerCase().includes(kw))) {
      techs.push({
        name: dep.name,
        category: "database",
        confidence: 0.7,
        evidence: `Found in ${dep.type} dependencies`,
      });
    }
  }

  return techs;
}

function findImportantFiles(files: ScannedFile[]): ImportantFile[] {
  const important: ImportantFile[] = [];

  for (const file of files) {
    const filename = file.relativePath.split("/").pop() ?? "";

    if (ENTRY_POINT_FILES.has(filename)) {
      important.push({
        path: file.relativePath,
        name: filename,
        purpose: "Application entry point",
        isEntryPoint: true,
        isConfig: false,
      });
    }

    if (CONFIG_FILES.has(filename) || CONFIG_FILES.has(file.relativePath)) {
      important.push({
        path: file.relativePath,
        name: filename,
        purpose: detectConfigPurpose(filename),
        isEntryPoint: false,
        isConfig: true,
      });
    }
  }

  return important;
}

function detectConfigPurpose(filename: string): string {
  if (filename === "package.json") return "Project dependencies and scripts";
  if (filename === "tsconfig.json") return "TypeScript configuration";
  if (filename.startsWith("next.config")) return "Next.js configuration";
  if (filename.startsWith("tailwind.config")) return "Tailwind CSS configuration";
  if (filename.startsWith("vite.config")) return "Vite build configuration";
  if (filename.startsWith("webpack.config")) return "Webpack build configuration";
  if (filename === "Dockerfile") return "Container build instructions";
  if (filename.includes("docker-compose")) return "Container orchestration";
  if (filename === "Makefile") return "Build automation";
  if (filename === "Cargo.toml") return "Rust package manifest";
  if (filename === "go.mod") return "Go module definition";
  return "Configuration file";
}

function detectProjectType(
  scan: ScanResult,
  dependencies: ParsedDependency[]
): string {
  const depNames = dependencies.map((d) => d.name.toLowerCase());
  const allNames = new Set(depNames);

  if (allNames.has("next")) return "Next.js Web Application";
  if (allNames.has("react") || allNames.has("react-dom")) return "React Web Application";
  if (allNames.has("vue")) return "Vue.js Web Application";
  if (allNames.has("@angular/core")) return "Angular Web Application";
  if (allNames.has("express")) return "Express.js API Server";
  if (allNames.has("django")) return "Django Web Application";
  if (allNames.has("flask")) return "Flask Web Application";
  if (allNames.has("rails")) return "Ruby on Rails Application";

  if (scan.languages.has("Rust")) return "Rust Application";
  if (scan.languages.has("Go")) return "Go Application";
  if (scan.languages.has("Python")) return "Python Application";
  if (scan.languages.has("Java")) return "Java Application";

  return "Software Project";
}

function detectArchitecturePatterns(
  scan: ScanResult,
  dependencies: ParsedDependency[]
): string[] {
  const patterns: string[] = [];
  const depNames = new Set(dependencies.map((d) => d.name.toLowerCase()));

  if (depNames.has("next") || depNames.has("@tanstack/react-query")) {
    patterns.push("API Routes");
    patterns.push("Server Components");
  }
  if (scan.files.some((f) => f.relativePath.includes("components/"))) {
    patterns.push("Component-Based Architecture");
  }
  if (scan.files.some((f) => f.relativePath.includes("pages/") || f.relativePath.includes("app/"))) {
    patterns.push("File-Based Routing");
  }
  if (depNames.has("prisma") || depNames.has("typeorm") || depNames.has("drizzle-orm")) {
    patterns.push("ORM Data Layer");
  }
  if (depNames.has("zod") || depNames.has("yup") || depNames.has("joi")) {
    patterns.push("Schema Validation");
  }

  return patterns;
}

function generatePurpose(
  scan: ScanResult,
  repoData: GitHubRepo | null
): string {
  if (repoData?.description) {
    return repoData.description;
  }

  // Try to infer from README or package.json
  const readme = scan.files.find((f) =>
    f.relativePath.toLowerCase() === "readme.md" ||
    f.relativePath.toLowerCase() === "readme"
  );

  if (readme) {
    const firstLine = readme.content.split("\n")[0]?.replace(/^#\s*/, "") ?? "";
    if (firstLine) return firstLine;
  }

  return "Source code repository";
}
