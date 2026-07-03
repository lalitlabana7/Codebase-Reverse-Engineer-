// Ingestion Engine - File System Scanner
import fs from "fs/promises";
import path from "path";
import ignore from "ignore";

export interface ScannedFile {
  path: string;
  relativePath: string;
  content: string;
  size: number;
  language: string | null;
}

export interface ScanResult {
  files: ScannedFile[];
  totalSize: number;
  fileCount: number;
  directoryCount: number;
  languages: Map<string, number>;
}

/** Default patterns to always ignore */
const DEFAULT_IGNORE = [
  "node_modules/**",
  ".git/**",
  "dist/**",
  "build/**",
  ".next/**",
  "__pycache__/**",
  "*.pyc",
  ".egg-info/**",
  "venv/**",
  ".venv/**",
  "target/**",
  "vendor/**",
  ".gradle/**",
  "*.class",
  "*.exe",
  "*.dll",
  "*.so",
  "*.dylib",
  "*.bin",
  ".DS_Store",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "*.lock",
  "*.map",
];

/** Maximum file size to read (1MB) */
const MAX_FILE_SIZE = 1_000_000;

/** Language detection by extension */
const EXTENSION_LANG: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript React",
  js: "JavaScript",
  jsx: "JavaScript React",
  mjs: "JavaScript",
  cjs: "JavaScript",
  py: "Python",
  rb: "Ruby",
  go: "Go",
  rs: "Rust",
  java: "Java",
  kt: "Kotlin",
  swift: "Swift",
  php: "PHP",
  cs: "C#",
  cpp: "C++",
  c: "C",
  h: "C/C++ Header",
  hpp: "C++ Header",
  scala: "Scala",
  vue: "Vue",
  svelte: "Svelte",
  astro: "Astro",
  css: "CSS",
  scss: "SCSS",
  less: "Less",
  html: "HTML",
  htm: "HTML",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
  json: "JSON",
  md: "Markdown",
  mdx: "MDX",
  sql: "SQL",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  dockerfile: "Dockerfile",
  tf: "Terraform",
  toml: "TOML",
  ini: "INI",
  cfg: "INI",
  env: "Dotenv",
  gradle: "Gradle",
};

export async function scanDirectory(
  dirPath: string,
  maxFiles = 5000
): Promise<ScanResult> {
  const ig = ignore().add(DEFAULT_IGNORE);

  // Load .gitignore if it exists
  try {
    const gitignoreContent = await fs.readFile(
      path.join(dirPath, ".gitignore"),
      "utf-8"
    );
    ig.add(gitignoreContent);
  } catch {
    // No .gitignore found
  }

  const files: ScannedFile[] = [];
  let totalSize = 0;
  let directoryCount = 0;
  const languages = new Map<string, number>();

  async function walk(currentPath: string): Promise<void> {
    if (files.length >= maxFiles) return;

    const relativePath = path.relative(dirPath, currentPath);

    // Check ignore patterns for directories
    if (relativePath && ig.ignores(relativePath)) return;

    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (files.length >= maxFiles) return;

      const entryPath = path.join(currentPath, entry.name);
      const entryRelativePath = path.relative(dirPath, entryPath);

      if (ig.ignores(entryRelativePath)) continue;

      if (entry.isDirectory()) {
        directoryCount++;
        await walk(entryPath);
      } else if (entry.isFile()) {
        const stats = await fs.stat(entryPath).catch(() => null);
        if (!stats || stats.size > MAX_FILE_SIZE) continue;

        // Skip binary files
        const ext = path.extname(entry.name).toLowerCase().slice(1);
        if (!ext && !isTextExtension(entry.name)) continue;

        try {
          const content = await fs.readFile(entryPath, "utf-8");
          const language = await detectLanguage(entry.name);

          files.push({
            path: entryPath,
            relativePath: entryRelativePath,
            content,
            size: stats.size,
            language,
          });

          totalSize += stats.size;
          languages.set(language ?? "Unknown", (languages.get(language ?? "Unknown") ?? 0) + 1);
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  await walk(dirPath);

  return {
    files,
    totalSize,
    fileCount: files.length,
    directoryCount,
    languages,
  };
}

export async function detectLanguage(filename: string): Promise<string | null> {
  const name = filename.toLowerCase();
  const ext = path.extname(name).slice(1);

  // Check for specific filenames
  if (name === "dockerfile") return "Dockerfile";
  if (name === "makefile") return "Makefile";
  if (name === ".gitignore") return "Git";
  if (name === ".env.example" || name === ".env") return "Dotenv";

  // Check extension
  if (ext in EXTENSION_LANG) return EXTENSION_LANG[ext];

  // Check for dotfiles with extensions
  const dotExt = path.extname(name.replace(/^\./, "")).slice(1);
  if (dotExt in EXTENSION_LANG) return EXTENSION_LANG[dotExt];

  return await detectLanguageByShebang(filename);
}

function isTextExtension(filename: string): boolean {
  const textExtensions = new Set([
    "ts", "tsx", "js", "jsx", "py", "rb", "go", "rs", "java",
    "md", "txt", "json", "yaml", "yml", "xml", "html", "css",
    "sh", "bash", "zsh", "env", "cfg", "ini", "conf", "toml",
  ]);
  const ext = path.extname(filename).toLowerCase().slice(1);
  return textExtensions.has(ext);
}

async function detectLanguageByShebang(filename: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filename, "utf-8");
    const firstLine = content.split("\n")[0] ?? "";
    if (firstLine.startsWith("#!")) {
      if (firstLine.includes("python")) return "Python";
      if (firstLine.includes("node")) return "JavaScript";
      if (firstLine.includes("bash") || firstLine.includes("sh")) return "Shell";
      if (firstLine.includes("ruby")) return "Ruby";
      if (firstLine.includes("deno")) return "TypeScript";
    }
  } catch {
    // Ignore read errors
  }
  return null;
}
