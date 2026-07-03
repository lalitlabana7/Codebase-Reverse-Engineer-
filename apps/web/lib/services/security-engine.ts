// Security Scanning Engine
import type { ScannedFile } from "@codebuff/ingestion";

// ======== Secret Detection ========
const SECRET_PATTERNS: Array<{
  name: string;
  regex: RegExp;
  severity: "critical" | "high" | "medium";
  type: "api_key" | "token" | "password" | "private_key" | "certificate" | "connection_string";
}> = [
  // AWS Keys
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/, severity: "critical", type: "api_key" },
  { name: "AWS Secret Key", regex: /(?![A-Za-z0-9/+=]{40})[A-Za-z0-9/+=]{40}/, severity: "critical", type: "token" },
  // GitHub Tokens
  { name: "GitHub Token", regex: /ghp_[A-Za-z0-9]{36}/, severity: "critical", type: "token" },
  { name: "GitHub Old Token", regex: /gho_[A-Za-z0-9]{36}/, severity: "critical", type: "token" },
  { name: "GitHub App Token", regex: /ghu_[A-Za-z0-9]{36}/, severity: "critical", type: "token" },
  { name: "GitHub Refresh Token", regex: /ghr_[A-Za-z0-9]{36}/, severity: "critical", type: "token" },
  // Generic API Keys
  { name: "Generic API Key", regex: /(?:api[_-]?key|apikey)['"]?\s*[:=]\s*['"][A-Za-z0-9_\-]{16,64}['"]/i, severity: "high", type: "api_key" },
  { name: "Bearer Token", regex: /bearer\s+[A-Za-z0-9_\-\.]{20,}/i, severity: "high", type: "token" },
  // Database URLs
  { name: "PostgreSQL URL", regex: /postgres(?:ql)?:\/\/[^@\s]+:[^@\s]+@[^\s]+/, severity: "critical", type: "connection_string" },
  { name: "MySQL URL", regex: /mysql:\/\/[^@\s]+:[^@\s]+@[^\s]+/, severity: "critical", type: "connection_string" },
  { name: "MongoDB URL", regex: /mongodb(?:\+srv)?:\/\/[^@\s]+:[^@\s]+@[^\s]+/, severity: "critical", type: "connection_string" },
  { name: "Redis URL", regex: /redis:\/\/[^@\s]+:[^@\s]+@[^\s]+/, severity: "high", type: "connection_string" },
  // Private Keys
  { name: "RSA Private Key", regex: /-----BEGIN\s+RSA\s+PRIVATE\s+KEY-----/, severity: "critical", type: "private_key" },
  { name: "SSH Private Key", regex: /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----/, severity: "critical", type: "private_key" },
  { name: "EC Private Key", regex: /-----BEGIN\s+EC\s+PRIVATE\s+KEY-----/, severity: "critical", type: "private_key" },
  // JWT Tokens
  { name: "JWT Token", regex: /eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/, severity: "high", type: "token" },
  // Slack Tokens
  { name: "Slack Token", regex: /xox[baprs]-[A-Za-z0-9\-]{10,}/, severity: "high", type: "token" },
  // Stripe Keys
  { name: "Stripe Secret Key", regex: /sk_live_[A-Za-z0-9]{24,}/, severity: "critical", type: "api_key" },
  { name: "Stripe Publishable Key", regex: /pk_live_[A-Za-z0-9]{24,}/, severity: "medium", type: "api_key" },
  // Google Keys
  { name: "Google API Key", regex: /AIza[0-9A-Za-z\-_]{35}/, severity: "high", type: "api_key" },
  // Generic Password
  { name: "Hardcoded Password", regex: /(?:password|pwd|passwd)['"]?\s*[:=]\s*['"][^'"]{8,}['"]/i, severity: "high", type: "password" },
  // Connection Strings
  { name: "Connection String", regex: /(?:connectionstring|conn_str)['"]?\s*[:=]\s*['"][^'"]+['"]/i, severity: "high", type: "connection_string" },
];

export interface SecretFinding {
  type: "secret";
  secretType: string;
  severity: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  context: string;
  valueHash: string;
}

export function scanForSecrets(files: ScannedFile[]): SecretFinding[] {
  const findings: SecretFinding[] = [];

  // Skip files that are likely test/fixture files
  const skipPaths = ["test", "tests", "__tests__", "fixtures", "mock", "sample", "example", "node_modules", "vendor"];

  for (const file of files) {
    // Skip binary, image, and test files
    if (skipPaths.some((p) => file.relativePath.includes(p))) continue;
    if (file.language === null && file.size > 100000) continue;

    const lines = file.content.split("\n");

    for (const pattern of SECRET_PATTERNS) {
      // Ensure regex has global flag for matchAll (some patterns may not include it)
      const regex = pattern.regex.global
        ? pattern.regex
        : new RegExp(pattern.regex.source, pattern.regex.flags + "g");
      const matches = file.content.matchAll(regex);

      for (const match of matches) {
        if (!match.index) continue;

        // Find the line number
        const contentBefore = file.content.slice(0, match.index);
        const lineStart = contentBefore.split("\n").length;
        const lineEnd = lineStart + match[0].split("\n").length - 1;

        // Get surrounding context
        const contextLines = lines.slice(Math.max(0, lineStart - 2), Math.min(lines.length, lineEnd + 2));
        const context = contextLines.join("\n");

        // Create a hash of the secret value
        const valueHash = Buffer.from(match[0]).toString("base64").slice(0, 32);

        findings.push({
          type: "secret",
          secretType: pattern.name,
          severity: pattern.severity,
          filePath: file.relativePath,
          lineStart,
          lineEnd,
          context,
          valueHash,
        });
      }
    }
  }

  return findings;
}

// ======== Vulnerability Detection ========
const VULNERABILITY_PATTERNS: Array<{
  title: string;
  description: string;
  pattern: RegExp;
  severity: "critical" | "high" | "medium" | "low";
  recommendation: string;
  cwe: string;
}> = [
  {
    title: "eval() Usage",
    description: "Use of eval() can lead to code injection vulnerabilities",
    pattern: /\beval\s*\(/g,
    severity: "high",
    recommendation: "Avoid using eval(). Use safer alternatives like JSON.parse() for JSON, or Function constructor for dynamic code.",
    cwe: "CWE-95",
  },
  {
    title: "innerHTML Assignment",
    description: "Setting innerHTML can lead to XSS vulnerabilities",
    pattern: /\.innerHTML\s*=/g,
    severity: "high",
    recommendation: "Use textContent or insertAdjacentHTML() with sanitized input instead of innerHTML.",
    cwe: "CWE-79",
  },
  {
    title: "SQL Query Concatenation",
    description: "SQL query built via string concatenation can lead to SQL injection",
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?['"]\s*\+/gi,
    severity: "critical",
    recommendation: "Use parameterized queries or prepared statements instead of string concatenation.",
    cwe: "CWE-89",
  },
  {
    title: "Insecure HTTP",
    description: "Usage of HTTP instead of HTTPS",
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/g,
    severity: "medium",
    recommendation: "Use HTTPS instead of HTTP for all network communications.",
    cwe: "CWE-319",
  },
  {
    title: "Command Injection Risk",
    description: "Usage of exec() or shell commands with user input",
    pattern: /\bexec\s*\(|child_process\.exec|shell_exec|system\s*\(/g,
    severity: "critical",
    recommendation: "Avoid executing shell commands with user input. Use safer APIs or sanitize inputs strictly.",
    cwe: "CWE-78",
  },
  {
    title: "Weak Cryptography",
    description: "Usage of weak cryptographic algorithms",
    pattern: /\bMD5\b|\bSHA1\b|\bDES\b|\bRC4\b/i,
    severity: "high",
    recommendation: "Use strong cryptographic algorithms like SHA-256, SHA-3, or bcrypt.",
    cwe: "CWE-327",
  },
  {
    title: "Hardcoded Secret",
    description: "Hardcoded secret or credential in source code",
    pattern: /(?:secret|credential|passphrase)['"]?\s*[:=]\s*['"][A-Za-z0-9!@#$%^&*()_+\-={}[\]|;:',.<>?]{8,}['"]/gi,
    severity: "high",
    recommendation: "Store secrets in environment variables or a secure secret management service.",
    cwe: "CWE-798",
  },
  {
    title: "Insecure Randomness",
    description: "Usage of Math.random() for security-sensitive operations",
    pattern: /Math\.random\(\)/g,
    severity: "medium",
    recommendation: "Use crypto.getRandomValues() or a cryptographically secure random generator for security purposes.",
    cwe: "CWE-338",
  },
  {
    title: "Prototype Pollution",
    description: "Potential prototype pollution vulnerability",
    pattern: /\[['"]__proto__['"]\]/g,
    severity: "high",
    recommendation: "Use Object.create(null) for maps or sanitize object keys to prevent prototype pollution.",
    cwe: "CWE-1321",
  },
  {
    title: "NoSQL Injection Risk",
    description: "Potential NoSQL injection via unvalidated user input in MongoDB queries",
    pattern: /\$\s*(?:where|regex|ne|gt|lt|in)\s*:/g,
    severity: "high",
    recommendation: "Validate and sanitize user input before using in MongoDB queries. Use schema validation.",
    cwe: "CWE-943",
  },
  {
    title: "Path Traversal Risk",
    description: "Potential path traversal vulnerability with user-controlled file paths",
    pattern: /(?:readFile|writeFile|readFileSync|writeFileSync)\s*\([^)]*\.\.\//g,
    severity: "high",
    recommendation: "Validate file paths and prevent directory traversal by resolving paths and checking they're within allowed directories.",
    cwe: "CWE-22",
  },
  {
    title: "Debug Endpoint in Production",
    description: "Debug or info endpoint that may leak sensitive information",
    pattern: /\/debug|\/info|\/status|\/health[^z]/gi,
    severity: "low",
    recommendation: "Disable debug endpoints in production or protect them with authentication.",
    cwe: "CWE-200",
  },
];

export interface VulnerabilityFinding {
  type: "vulnerability";
  title: string;
  description: string;
  severity: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  recommendation: string;
  cwe: string;
}

export function scanForVulnerabilities(files: ScannedFile[]): VulnerabilityFinding[] {
  const findings: VulnerabilityFinding[] = [];

  // Only scan source code files
  const sourceExtensions = new Set([
    "ts", "tsx", "js", "jsx", "mjs", "py", "rb", "go", "rs", "java",
    "php", "cs", "cpp", "c", "h", "kt", "swift", "scala",
  ]);

  for (const file of files) {
    const ext = file.relativePath.split(".").pop()?.toLowerCase();
    if (!ext || !sourceExtensions.has(ext)) continue;

    for (const vuln of VULNERABILITY_PATTERNS) {
      // Ensure regex has global flag for matchAll
      const regex = vuln.pattern.global
        ? vuln.pattern
        : new RegExp(vuln.pattern.source, vuln.pattern.flags + "g");
      const matches = file.content.matchAll(regex);

      for (const match of matches) {
        if (!match.index) continue;

        const contentBefore = file.content.slice(0, match.index);
        const lineStart = contentBefore.split("\n").length;
        const lineEnd = lineStart + match[0].split("\n").length - 1;

        findings.push({
          type: "vulnerability",
          title: vuln.title,
          description: vuln.description,
          severity: vuln.severity,
          filePath: file.relativePath,
          lineStart,
          lineEnd,
          codeSnippet: match[0].slice(0, 200),
          recommendation: vuln.recommendation,
          cwe: vuln.cwe,
        });
      }
    }
  }

  return findings;
}

// ======== OWASP Top 10 Analysis ========
const OWASP_CATEGORIES: Array<{
  id: string;
  name: string;
  description: string;
  checkFunction: (files: ScannedFile[]) => OWASPFinding[];
}> = [
  {
    id: "A01",
    name: "Broken Access Control",
    description: "Failures related to authorization and access control",
    checkFunction: checkAccessControl,
  },
  {
    id: "A02",
    name: "Cryptographic Failures",
    description: "Failures related to cryptography and data protection",
    checkFunction: checkCryptoFailures,
  },
  {
    id: "A03",
    name: "Injection",
    description: "SQL, NoSQL, OS command, and LDAP injection flaws",
    checkFunction: checkInjection,
  },
  {
    id: "A04",
    name: "Insecure Design",
    description: "Design flaws in architecture and threat modeling",
    checkFunction: checkInsecureDesign,
  },
  {
    id: "A05",
    name: "Security Misconfiguration",
    description: "Improper configuration of security settings",
    checkFunction: checkMisconfig,
  },
  {
    id: "A06",
    name: "Vulnerable Components",
    description: "Using components with known vulnerabilities",
    checkFunction: checkVulnerableComponents,
  },
  {
    id: "A07",
    name: "Authentication Failures",
    description: "Flaws in identity and authentication mechanisms",
    checkFunction: checkAuthFailures,
  },
  {
    id: "A08",
    name: "Data Integrity Failures",
    description: "Failures related to software and data integrity",
    checkFunction: checkDataIntegrity,
  },
  {
    id: "A09",
    name: "Logging Failures",
    description: "Insufficient logging and monitoring",
    checkFunction: checkLogging,
  },
  {
    id: "A10",
    name: "SSRF",
    description: "Server-Side Request Forgery",
    checkFunction: checkSSRF,
  },
];

export interface OWASPFinding {
  type: "owasp";
  owaspCategory: string;
  owaspId: string;
  title: string;
  description: string;
  severity: string;
  filePath: string;
  recommendation: string;
}

function checkAccessControl(files: ScannedFile[]): OWASPFinding[] {
  const findings: OWASPFinding[] = [];
  for (const file of files) {
    // Check for missing authorization checks
    if (file.relativePath.includes("routes") || file.relativePath.includes("api")) {
      const hasAuthCheck = /auth|protect|authenticate|authorize|middleware/i.test(file.content);
      if (!hasAuthCheck && file.content.includes("handler") || file.content.includes("router")) {
        findings.push({
          type: "owasp",
          owaspCategory: "Broken Access Control",
          owaspId: "A01",
          title: "Missing Authorization Check",
          description: "API route or handler may lack authorization checks",
          severity: "high",
          filePath: file.relativePath,
          recommendation: "Implement proper authorization checks using middleware or decorators for all protected routes.",
        });
      }
    }
  }
  return findings;
}

function checkCryptoFailures(files: ScannedFile[]): OWASPFinding[] {
  const findings: OWASPFinding[] = [];
  for (const file of files) {
    if (/http:\/\//.test(file.content) && !/localhost|127\.0\.0\.1/.test(file.content)) {
      findings.push({
        type: "owasp",
        owaspCategory: "Cryptographic Failures",
        owaspId: "A02",
        title: "HTTP Usage Instead of HTTPS",
        description: "Using unencrypted HTTP connections instead of HTTPS",
        severity: "high",
        filePath: file.relativePath,
        recommendation: "Replace HTTP with HTTPS for all external communications.",
      });
    }
    if (/MD5|SHA1|DES\b/i.test(file.content)) {
      findings.push({
        type: "owasp",
        owaspCategory: "Cryptographic Failures",
        owaspId: "A02",
        title: "Weak Cryptographic Algorithm",
        description: "Usage of weak or deprecated cryptographic algorithm",
        severity: "high",
        filePath: file.relativePath,
        recommendation: "Use modern cryptographic algorithms like SHA-256, SHA-3, or bcrypt.",
      });
    }
  }
  return findings;
}

function checkInjection(files: ScannedFile[]): OWASPFinding[] {
  const findings: OWASPFinding[] = [];
  for (const file of files) {
    if (/\beval\s*\(/.test(file.content)) {
      findings.push({
        type: "owasp",
        owaspCategory: "Injection",
        owaspId: "A03",
        title: "Code Injection via eval()",
        description: "Use of eval() can lead to code injection attacks",
        severity: "critical",
        filePath: file.relativePath,
        recommendation: "Remove eval() usage and use safer alternatives.",
      });
    }
  }
  return findings;
}

function checkInsecureDesign(files: ScannedFile[]): OWASPFinding[] {
  const findings: OWASPFinding[] = [];
  for (const file of files) {
    if (file.relativePath === "package.json" && !file.content.includes("helmet") && !file.content.includes("cors")) {
      findings.push({
        type: "owasp",
        owaspCategory: "Insecure Design",
        owaspId: "A04",
        title: "Missing Security Headers Package",
        description: "No security middleware (helmet, cors) found in dependencies",
        severity: "medium",
        filePath: file.relativePath,
        recommendation: "Add helmet and configure CORS properly to secure HTTP headers.",
      });
    }
  }
  return findings;
}

function checkMisconfig(files: ScannedFile[]): OWASPFinding[] {
  const findings: OWASPFinding[] = [];
  for (const file of files) {
    if (file.relativePath.includes("cors") && /origin\s*:\s*['"]\*['"]/.test(file.content)) {
      findings.push({
        type: "owasp",
        owaspCategory: "Security Misconfiguration",
        owaspId: "A05",
        title: "Permissive CORS Policy",
        description: "CORS is configured to allow all origins (*)",
        severity: "medium",
        filePath: file.relativePath,
        recommendation: "Restrict CORS to specific allowed origins instead of using wildcard.",
      });
    }
  }
  return findings;
}

function checkVulnerableComponents(files: ScannedFile[]): OWASPFinding[] {
  const findings: OWASPFinding[] = [];
  for (const file of files) {
    if (file.relativePath.endsWith("package.json")) {
      try {
        const pkg = JSON.parse(file.content);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
        for (const [name, version] of Object.entries(deps)) {
          if (version.startsWith("0.") || version.includes("-alpha") || version.includes("-beta")) {
            findings.push({
              type: "owasp",
              owaspCategory: "Vulnerable Components",
              owaspId: "A06",
              title: `Pre-release Dependency: ${name}`,
              description: `Using pre-release version ${version} of ${name}`,
              severity: "medium",
              filePath: file.relativePath,
              recommendation: `Update ${name} to a stable release version.`,
            });
          }
        }
      } catch {
        // Parse error
      }
    }
  }
  return findings;
}

function checkAuthFailures(files: ScannedFile[]): OWASPFinding[] {
  const findings: OWASPFinding[] = [];
  for (const file of files) {
    if (/password|passwd/.test(file.relativePath) && file.content.includes("text") && !file.content.includes("hash") && !file.content.includes("bcrypt")) {
      findings.push({
        type: "owasp",
        owaspCategory: "Authentication Failures",
        owaspId: "A07",
        title: "Plaintext Password Storage",
        description: "Passwords may be stored or transmitted without hashing",
        severity: "critical",
        filePath: file.relativePath,
        recommendation: "Always hash passwords using bcrypt, Argon2, or similar before storage.",
      });
    }
  }
  return findings;
}

function checkDataIntegrity(files: ScannedFile[]): OWASPFinding[] {
  const findings: OWASPFinding[] = [];
  for (const file of files) {
    if (/JSON\.parse\(/.test(file.content) && !/JSON\.stringify/.test(file.content)) {
      findings.push({
        type: "owasp",
        owaspCategory: "Data Integrity Failures",
        owaspId: "A08",
        title: "Unsigned Data Parsing",
        description: "Parsing JSON or data without integrity verification",
        severity: "low",
        filePath: file.relativePath,
        recommendation: "Verify data integrity using digital signatures or HMAC where applicable.",
      });
    }
  }
  return findings;
}

function checkLogging(files: ScannedFile[]): OWASPFinding[] {
  const findings: OWASPFinding[] = [];
  for (const file of files) {
    if (file.content.includes("password") && file.content.includes("log") && !file.content.includes("redact") && !file.content.includes("mask")) {
      findings.push({
        type: "owasp",
        owaspCategory: "Logging Failures",
        owaspId: "A09",
        title: "Sensitive Data in Logs",
        description: "Potential logging of sensitive information like passwords",
        severity: "high",
        filePath: file.relativePath,
        recommendation: "Implement log redaction/masking for sensitive data like passwords, tokens, and PII.",
      });
    }
  }
  return findings;
}

function checkSSRF(files: ScannedFile[]): OWASPFinding[] {
  const findings: OWASPFinding[] = [];
  for (const file of files) {
    if (/fetch\s*\(|axios\.(get|post)|https\.(get|request)/.test(file.content) && !/validate|sanitize|allowlist/i.test(file.content)) {
      findings.push({
        type: "owasp",
        owaspCategory: "SSRF",
        owaspId: "A10",
        title: "Potential SSRF Vulnerability",
        description: "Making HTTP requests without URL validation could lead to SSRF",
        severity: "high",
        filePath: file.relativePath,
        recommendation: "Validate and sanitize URLs before making requests. Use an allowlist of permitted domains.",
      });
    }
  }
  return findings;
}

export function analyzeOWASP(files: ScannedFile[]): OWASPFinding[] {
  const findings: OWASPFinding[] = [];
  for (const category of OWASP_CATEGORIES) {
    try {
      const categoryFindings = category.checkFunction(files);
      findings.push(...categoryFindings);
    } catch {
      // Skip errors in individual checks
    }
  }
  return findings;
}

// ======== Security Score Calculation ========
export function calculateSecurityScore(params: {
  vulnerabilityCount: number;
  secretCount: number;
  criticalCount: number;
  highCount: number;
  totalFiles: number;
  dependencyCount: number;
  outdatedDeps: number;
}): {
  overall: number;
  codeQuality: number;
  dependencyHealth: number;
  architectureScore: number;
  vulnerabilityScore: number;
  riskPosture: string;
} {
  const { vulnerabilityCount, secretCount, criticalCount, highCount, totalFiles, dependencyCount, outdatedDeps } = params;

  // Vulnerability score (100 - penalty for findings)
  const vulnWeight = Math.min(vulnerabilityCount + secretCount, 100);
  const vulnSeverityPenalty = criticalCount * 15 + highCount * 5;
  const vulnerabilityScore = Math.max(0, 100 - vulnWeight - vulnSeverityPenalty);

  // Code quality score (based on file count and structure)
  const codeQuality = totalFiles > 0 ? Math.min(100, 80 + Math.log10(totalFiles) * 5) : 0;

  // Dependency health score
  const depRatio = dependencyCount > 0 ? outdatedDeps / dependencyCount : 0;
  const dependencyHealth = Math.max(0, 100 - depRatio * 100);

  // Architecture score (default to 70 for now)
  const architectureScore = 70;

  // Overall score
  const overall = Math.round(
    (vulnerabilityScore * 0.4 + codeQuality * 0.2 + dependencyHealth * 0.2 + architectureScore * 0.2)
  );

  // Risk posture
  let riskPosture: string;
  if (overall >= 80) riskPosture = "low";
  else if (overall >= 60) riskPosture = "medium";
  else if (overall >= 40) riskPosture = "high";
  else riskPosture = "critical";

  return {
    overall,
    codeQuality: Math.round(codeQuality),
    dependencyHealth: Math.round(dependencyHealth),
    architectureScore,
    vulnerabilityScore: Math.round(vulnerabilityScore),
    riskPosture,
  };
}

// ======== Attack Surface Mapping ========
export function mapAttackSurface(files: ScannedFile[]): {
  entryPoints: Array<{ path: string; method: string; authRequired: boolean }>;
  sensitiveFiles: Array<{ path: string; type: string; risk: string }>;
  threatModels: Array<{ category: string; threats: string[]; mitigations: string[] }>;
} {
  const entryPoints: Array<{ path: string; method: string; authRequired: boolean }> = [];
  const sensitiveFiles: Array<{ path: string; type: string; risk: string }> = [];

  for (const file of files) {
    // Detect API routes/endpoints
    const apiMatch = file.content.matchAll(/(?:router|app)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi);
    for (const match of apiMatch) {
      entryPoints.push({
        path: match[2]!,
        method: match[1]!.toUpperCase(),
        authRequired: file.content.includes("auth") || file.content.includes("protect"),
      });
    }

    // Detect sensitive files
    const name = file.relativePath.toLowerCase();
    if (name.includes(".env")) {
      sensitiveFiles.push({ path: file.relativePath, type: "credential", risk: "critical" });
    } else if (name.includes("secret") || name.includes("credential")) {
      sensitiveFiles.push({ path: file.relativePath, type: "credential", risk: "high" });
    } else if (name.includes("config") && (name.endsWith(".json") || name.endsWith(".yml") || name.endsWith(".yaml"))) {
      sensitiveFiles.push({ path: file.relativePath, type: "config", risk: "medium" });
    } else if (name.includes("key") && !name.includes("keyboard")) {
      sensitiveFiles.push({ path: file.relativePath, type: "key", risk: "high" });
    } else if (name.includes("cert") || name.includes("pem") || name.endsWith(".p12") || name.endsWith(".pfx")) {
      sensitiveFiles.push({ path: file.relativePath, type: "certificate", risk: "high" });
    }
  }

  // Threat models
  const threatModels = [
    {
      category: "spoofing",
      threats: ["Authentication bypass", "Session hijacking", "Identity spoofing"],
      mitigations: ["Implement MFA", "Use short-lived session tokens", "Validate all authentication claims"],
    },
    {
      category: "tampering",
      threats: ["Data modification in transit", "Request manipulation", "Configuration tampering"],
      mitigations: ["Use HTTPS/TLS", "Implement request signing", "Hash integrity checks"],
    },
    {
      category: "information_disclosure",
      threats: ["Sensitive data exposure", "Debug info leakage", "Error message information"],
      mitigations: ["Encrypt sensitive data", "Disable debug mode in production", "Use generic error messages"],
    },
    {
      category: "denial_of_service",
      threats: ["Resource exhaustion", "Rate limiting bypass", "Algorithmic complexity attacks"],
      mitigations: ["Implement rate limiting", "Set request size limits", "Use CDN and caching"],
    },
    {
      category: "elevation_of_privilege",
      threats: ["Privilege escalation", "Role bypass", "Admin access abuse"],
      mitigations: ["Principle of least privilege", "Role-based access control", "Audit all privilege changes"],
    },
  ];

  return { entryPoints, sensitiveFiles, threatModels };
}
