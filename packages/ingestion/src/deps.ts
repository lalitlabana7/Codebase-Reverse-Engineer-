// Ingestion Engine - Dependency Parser
export interface ParsedDependency {
  name: string;
  version: string;
  type: "npm" | "pip" | "go" | "cargo" | "maven" | "ruby" | "nuget" | "docker";
  isDirect: boolean;
  isDevDependency: boolean;
  isOptional?: boolean;
}

export interface DependencyParseResult {
  ecosystem: string;
  dependencies: ParsedDependency[];
  manifestPath: string;
}

export function parseDependencies(
  filePath: string,
  content: string
): DependencyParseResult | null {
  const filename = filePath.toLowerCase().split("/").pop() ?? "";

  try {
    if (filename === "package.json") {
      return parseNpmPackage(content, filePath);
    }
    if (filename === "requirements.txt") {
      return parsePipRequirements(content, filePath);
    }
    if (filename === "cargo.toml") {
      return parseCargoToml(content, filePath);
    }
    if (filename === "go.mod") {
      return parseGoMod(content, filePath);
    }
    if (filename === "gemfile") {
      return parseGemfile(content, filePath);
    }
    if (filename === "pom.xml") {
      return parseMavenPom(content, filePath);
    }
    if (filename === "packages.config" || filename.endsWith(".csproj")) {
      return parseNuget(content, filePath);
    }
    if (filename === "dockerfile") {
      return parseDockerfile(content, filePath);
    }
    if (filename === "gemfile.lock" || filename === "package-lock.json" || filename === "yarn.lock" || filename === "pnpm-lock.yaml") {
      return null; // Skip lock files, they're derived from manifest files
    }
  } catch {
    return null;
  }

  return null;
}

function parseNpmPackage(content: string, filePath: string): DependencyParseResult | null {
  try {
    const pkg = JSON.parse(content);
    const deps: ParsedDependency[] = [];

    // Direct dependencies
    if (pkg.dependencies) {
      for (const [name, version] of Object.entries(pkg.dependencies)) {
        deps.push({
          name,
          version: String(version),
          type: "npm",
          isDirect: true,
          isDevDependency: false,
        });
      }
    }

    // Dev dependencies
    if (pkg.devDependencies) {
      for (const [name, version] of Object.entries(pkg.devDependencies)) {
        deps.push({
          name,
          version: String(version),
          type: "npm",
          isDirect: true,
          isDevDependency: true,
        });
      }
    }

    // Peer dependencies
    if (pkg.peerDependencies) {
      for (const [name, version] of Object.entries(pkg.peerDependencies)) {
        deps.push({
          name,
          version: String(version),
          type: "npm",
          isDirect: true,
          isDevDependency: false,
          isOptional: true,
        });
      }
    }

    return {
      ecosystem: "npm",
      dependencies: deps,
      manifestPath: filePath,
    };
  } catch {
    return null;
  }
}

function parsePipRequirements(content: string, filePath: string): DependencyParseResult | null {
  const deps: ParsedDependency[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) continue;

    // Parse package name and version
    const match = trimmed.match(/^([a-zA-Z0-9_.-]+)\s*([><=!~]+\s*[\d.*]+)?/);
    if (match) {
      deps.push({
        name: match[1]!,
        version: (match[2] ?? "*").trim(),
        type: "pip",
        isDirect: true,
        isDevDependency: false,
      });
    }
  }

  return deps.length > 0
    ? { ecosystem: "pip", dependencies: deps, manifestPath: filePath }
    : null;
}

function parseCargoToml(content: string, filePath: string): DependencyParseResult | null {
  const deps: ParsedDependency[] = [];
  let currentSection = "";

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[")) {
      currentSection = trimmed.slice(1, -1);
      continue;
    }

    if (currentSection === "dependencies" || currentSection.startsWith("dependencies.")) {
      const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*["{]([^"}]+)/);
      if (match) {
        deps.push({
          name: match[1]!,
          version: match[2]!.replace(/"/g, "").trim(),
          type: "cargo",
          isDirect: true,
          isDevDependency: false,
        });
      }
    } else if (currentSection === "dev-dependencies") {
      const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*["{]([^"}]+)/);
      if (match) {
        deps.push({
          name: match[1]!,
          version: match[2]!.replace(/"/g, "").trim(),
          type: "cargo",
          isDirect: true,
          isDevDependency: true,
        });
      }
    }
  }

  return deps.length > 0
    ? { ecosystem: "cargo", dependencies: deps, manifestPath: filePath }
    : null;
}

function parseGoMod(content: string, filePath: string): DependencyParseResult | null {
  const deps: ParsedDependency[] = [];
  let inRequire = false;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    if (trimmed.startsWith("require (")) {
      inRequire = true;
      continue;
    }
    if (trimmed === ")") {
      inRequire = false;
      continue;
    }

    if (inRequire || trimmed.startsWith("require ")) {
      const match = trimmed.match(/([^\s]+)\s+v?([\d.]+)/);
      if (match && trimmed.startsWith("require")) {
        deps.push({
          name: match[1]!,
          version: match[2]!,
          type: "go",
          isDirect: true,
          isDevDependency: false,
        });
      } else if (match) {
        deps.push({
          name: match[1]!,
          version: match[2]!,
          type: "go",
          isDirect: true,
          isDevDependency: false,
        });
      }
    }
  }

  return deps.length > 0
    ? { ecosystem: "go", dependencies: deps, manifestPath: filePath }
    : null;
}

function parseGemfile(content: string, filePath: string): DependencyParseResult | null {
  const deps: ParsedDependency[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    const match = trimmed.match(/^gem\s+["']([^"']+)["']\s*(?:,\s*["']([^"']+)["'])?/);
    if (match) {
      deps.push({
        name: match[1]!,
        version: match[2] ?? "*",
        type: "ruby",
        isDirect: true,
        isDevDependency: trimmed.startsWith("group :development") || trimmed.includes(":development"),
      });
    }
  }

  return deps.length > 0
    ? { ecosystem: "ruby", dependencies: deps, manifestPath: filePath }
    : null;
}

function parseMavenPom(content: string, filePath: string): DependencyParseResult | null {
  const deps: ParsedDependency[] = [];
  const depRegex = /<dependency>[\s\S]*?<groupId>([^<]+)<\/groupId>[\s\S]*?<artifactId>([^<]+)<\/artifactId>[\s\S]*?(?:<version>([^<]*)<\/version>)?[\s\S]*?(?:<scope>([^<]*)<\/scope>)?[\s\S]*?<\/dependency>/gi;

  let match;
  while ((match = depRegex.exec(content)) !== null) {
    deps.push({
      name: `${match[1]}:${match[2]}`,
      version: match[3] ?? "*",
      type: "maven",
      isDirect: true,
      isDevDependency: (match[4] ?? "").toLowerCase() === "test",
    });
  }

  return deps.length > 0
    ? { ecosystem: "maven", dependencies: deps, manifestPath: filePath }
    : null;
}

function parseNuget(content: string, filePath: string): DependencyParseResult | null {
  const deps: ParsedDependency[] = [];
  const packageRefRegex = /<PackageReference\s+Include="([^"]+)"\s+Version="([^"]+)"\s*\/?>/gi;

  let match;
  while ((match = packageRefRegex.exec(content)) !== null) {
    deps.push({
      name: match[1]!,
      version: match[2]!,
      type: "nuget",
      isDirect: true,
      isDevDependency: false,
    });
  }

  return deps.length > 0
    ? { ecosystem: "nuget", dependencies: deps, manifestPath: filePath }
    : null;
}

function parseDockerfile(content: string, filePath: string): DependencyParseResult | null {
  const deps: ParsedDependency[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    const fromMatch = trimmed.match(/^FROM\s+([^\s]+)/i);
    if (fromMatch) {
      deps.push({
        name: fromMatch[1]!,
        version: "latest",
        type: "docker",
        isDirect: true,
        isDevDependency: false,
      });
    }
  }

  return deps.length > 0
    ? { ecosystem: "docker", dependencies: deps, manifestPath: filePath }
    : null;
}
