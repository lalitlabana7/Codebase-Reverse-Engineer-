// Ingestion Engine - GitHub API Analyzer
// Analyzes a repository using the GitHub API instead of git clone + filesystem.
// Fully compatible with serverless environments (Vercel, etc.)

import { GitHubClient, type ScannedAPIFile, type GitHubRepo } from "./github";
import { parseGitUrl } from "./git";
import { parseDependencies, type ParsedDependency } from "./deps";
import { chunkFile, type CodeChunk } from "./chunker";
import type { AnalysisInput, AnalysisOutput, FolderEntry, TechDetection, ImportantFile } from "./analyzer";

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

/**
 * Analyze a repository using the GitHub API.
 * Works entirely via HTTP — no git binary, no filesystem access needed.
 *
 * Steps:
 *  1. Parse the Git URL to extract owner/repo
 *  2. Fetch repo metadata via GitHub API
 *  3. Fetch file tree and file contents via GitHub API
 *  4. Parse dependencies from manifest files
 *  5. Chunk source code for RAG
 *  6. Detect technologies and build folder structure
 *  7. Return AnalysisOutput (same shape as the local analyzeRepository)
 */
export async function analyzeRepositoryViaApi(input: AnalysisInput): Promise<AnalysisOutput> {
  const parsed = parseGitUrl(input.url);
  if (parsed.type !== "github" || !parsed.fullName) {
    throw new Error(
      "GitHub API analysis requires a GitHub repository URL (e.g., https://github.com/owner/repo)"
    );
  }

  const github = new GitHubClient(input.githubToken);
  const fullName = parsed.fullName;

  // 1. Fetch repo metadata
  let repoData: GitHubRepo | null = null;
  try {
    repoData = await github.getRepo(fullName);
  } catch {
    // Continue without metadata
  }

  const branch = input.branch ?? repoData?.default_branch ?? "main";

  // 2. Fetch file contents via API
  let apiResult: { files: ScannedAPIFile[]; fileCount: number; totalSize: number; directoryCount: number };
  try {
    apiResult = await github.getRepoContents(fullName, { branch, maxFiles: 150 });
  } catch (error: any) {
    throw new Error(`Failed to fetch repository contents: ${error.message}`);
  }

  if (apiResult.files.length === 0) {
    throw new Error("No source files found in repository");
  }

  // 3. Process files: parse deps + chunk code
  const dependencies: ParsedDependency[] = [];
  const chunks: CodeChunk[] = [];

  for (const file of apiResult.files) {
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

  // 4. Build folder structure
  const folderStructure = buildFolderTreeFromApi(apiResult.files);

  // 5. Detect technologies
  const languages = new Map<string, number>();
  for (const f of apiResult.files) {
    const lang = f.language ?? "Unknown";
    languages.set(lang, (languages.get(lang) ?? 0) + 1);
  }

  const technologies = detectTechnologiesFromApi(languages, dependencies);

  // 6. Find important files
  const importantFiles = findImportantFilesFromApi(apiResult.files);

  // 7. Generate summary
  const projectType = detectProjectTypeFromApi(languages, dependencies);
  const architecture = detectArchitecturePatternsFromApi(apiResult.files, dependencies);

  const summary = {
    purpose: repoData?.description ?? "Source code repository",
    projectType,
    techStack: technologies.map((t) => t.name),
    architecture,
    fileCount: apiResult.fileCount,
    dependencyCount: dependencies.length,
  };

  return {
    repository: {
      name: repoData?.name ?? parsed.repo ?? "unknown",
      fullName: repoData?.full_name ?? parsed.fullName ?? null,
      description: repoData?.description ?? null,
      defaultBranch: branch,
      language: repoData?.language ?? null,
      topics: repoData?.topics ?? [],
      stars: repoData?.stargazers_count ?? 0,
      isPrivate: repoData?.private ?? false,
      size: apiResult.totalSize,
      url: input.url,
    },
    scan: {
      files: apiResult.files.map((f) => ({
        path: f.relativePath,
        relativePath: f.relativePath,
        content: f.content,
        size: f.size,
        language: f.language,
      })),
      totalSize: apiResult.totalSize,
      fileCount: apiResult.fileCount,
      directoryCount: apiResult.directoryCount,
      languages,
    },
    dependencies,
    chunks,
    folderStructure,
    technologies,
    importantFiles,
    summary,
  };
}

// ======== Helper functions (mirror analyzer.ts but work with ScannedAPIFile) ========

function buildFolderTreeFromApi(files: ScannedAPIFile[]): FolderEntry[] {
  const root: FolderEntry[] = [];

  for (const file of files) {
    const parts = file.relativePath.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isLast = i === parts.length - 1;

      if (isLast) {
        current.push({
          name: part,
          path: file.relativePath,
          type: "file",
          size: file.size,
          language: file.language ?? undefined,
        });
      } else {
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

function detectTechnologiesFromApi(
  languages: Map<string, number>,
  dependencies: ParsedDependency[]
): TechDetection[] {
  const techs: TechDetection[] = [];

  for (const [lang, count] of languages) {
    if (count > 0) {
      techs.push({
        name: lang,
        category: "language",
        confidence: Math.min(1, count / 10),
      });
    }
  }

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
    TypeORM: { name: "TypeORM", deps: ["typeorm"] },
  };

  const depNames = new Set(dependencies.map((d) => d.name));
  for (const [, framework] of Object.entries(frameworkKeywords)) {
    if (framework.deps.some((d) => depNames.has(d))) {
      techs.push({ name: framework.name, category: "framework", confidence: 0.9 });
    }
  }

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

function findImportantFilesFromApi(files: ScannedAPIFile[]): ImportantFile[] {
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
        purpose: detectConfigPurposeFromApi(filename),
        isEntryPoint: false,
        isConfig: true,
      });
    }
  }

  return important;
}

function detectConfigPurposeFromApi(filename: string): string {
  if (filename === "package.json") return "Project dependencies and scripts";
  if (filename === "tsconfig.json") return "TypeScript configuration";
  if (filename.startsWith("next.config")) return "Next.js configuration";
  if (filename.startsWith("tailwind.config")) return "Tailwind CSS configuration";
  if (filename.startsWith("vite.config")) return "Vite build configuration";
  if (filename === "Dockerfile") return "Container build instructions";
  if (filename.includes("docker-compose")) return "Container orchestration";
  if (filename === "Makefile") return "Build automation";
  if (filename === "Cargo.toml") return "Rust package manifest";
  if (filename === "go.mod") return "Go module definition";
  return "Configuration file";
}

function detectProjectTypeFromApi(
  languages: Map<string, number>,
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

  if (languages.has("Rust")) return "Rust Application";
  if (languages.has("Go")) return "Go Application";
  if (languages.has("Python")) return "Python Application";
  if (languages.has("Java")) return "Java Application";

  return "Software Project";
}

function detectArchitecturePatternsFromApi(
  files: ScannedAPIFile[],
  dependencies: ParsedDependency[]
): string[] {
  const patterns: string[] = [];
  const depNames = new Set(dependencies.map((d) => d.name.toLowerCase()));

  if (depNames.has("next") || depNames.has("@tanstack/react-query")) {
    patterns.push("API Routes");
    patterns.push("Server Components");
  }
  if (files.some((f) => f.relativePath.includes("components/"))) {
    patterns.push("Component-Based Architecture");
  }
  if (files.some((f) => f.relativePath.includes("pages/") || f.relativePath.includes("app/"))) {
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
