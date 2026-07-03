// === Analysis Types ===
export interface AnalysisSummary {
  purpose: string;
  projectType: string;
  keyFeatures: string[];
  techStack: Technology[];
}

export interface Technology {
  name: string;
  category: "language" | "framework" | "library" | "tool" | "database" | "infrastructure";
  version?: string;
  confidence: number;
}

export interface FolderNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FolderNode[];
  size?: number;
  language?: string;
}

export interface ImportantFile {
  path: string;
  name: string;
  purpose: string;
  isEntryPoint: boolean;
  isConfig: boolean;
}

// === Security Types ===
export interface SecurityFinding {
  id: string;
  type: "vulnerability" | "secret" | "owasp" | "misconfig" | "cve";
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  codeSnippet?: string;
  cveId?: string;
  owaspCategory?: string;
  recommendation?: string;
  fixExample?: string;
  status: "open" | "in_review" | "resolved" | "dismissed";
  createdAt: string;
}

export interface SecurityScore {
  overall: number;
  codeQuality: number;
  dependencyHealth: number;
  architectureScore: number;
  vulnerabilityScore: number;
  riskPosture: "low" | "medium" | "high" | "critical";
  trend: "improving" | "stable" | "declining";
}

export interface AttackSurfaceData {
  entryPoints: Endpoint[];
  authenticationZones: AuthZone[];
  exposedServices: ExposedService[];
  sensitiveFiles: SensitiveFile[];
  dataFlows: DataFlow[];
  threatModels: ThreatModel[];
  mitreAttackMappings: MitreTechnique[];
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface Endpoint {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
  authRequired: boolean;
  description?: string;
}

export interface AuthZone {
  name: string;
  type: "oauth" | "jwt" | "session" | "api_key" | "basic";
  strength: "weak" | "moderate" | "strong";
}

export interface ExposedService {
  name: string;
  port?: number;
  protocol: string;
  risk: "low" | "medium" | "high";
}

export interface SensitiveFile {
  path: string;
  type: "config" | "credential" | "database" | "key" | "certificate";
  risk: "low" | "medium" | "high" | "critical";
}

export interface DataFlow {
  source: string;
  target: string;
  dataType: string;
  isEncrypted: boolean;
}

export interface ThreatModel {
  category: "spoofing" | "tampering" | "repudiation" | "information_disclosure" | "denial_of_service" | "elevation_of_privilege";
  threats: string[];
  mitigations: string[];
}

export interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
  detected: boolean;
  evidence?: string;
}

// === Dependency Types ===
export interface DependencyInfo {
  id: string;
  name: string;
  version: string;
  latestVersion?: string;
  type: "npm" | "pip" | "go" | "cargo" | "maven" | "ruby" | "nuget" | "docker";
  isDirect: boolean;
  isDevDependency: boolean;
  isOutdated: boolean;
  riskScore?: number;
  vulnerabilities: VulnerabilityInfo[];
}

export interface DependencyNode {
  id: string;
  name: string;
  version: string;
  isOutdated: boolean;
  riskScore?: number;
  group?: string;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: "depends" | "dev_depends" | "optional";
}

export interface VulnerabilityInfo {
  cveId: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  fixedIn?: string;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

// === Diagram Types ===
export interface DiagramNode {
  id: string;
  label: string;
  type: string;
  x?: number;
  y?: number;
  metadata?: Record<string, unknown>;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: "solid" | "dashed" | "dotted";
}

export interface DiagramData {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  title: string;
  type: string;
}

// === Chat Types ===
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: SourceReference[];
  createdAt: string;
}

export interface SourceReference {
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
  snippet?: string;
  relevance: number;
}

// === Compliance Types ===
export interface ComplianceFinding {
  control: string;
  status: "passed" | "failed" | "not_applicable";
  description: string;
  recommendation: string;
}

export interface ComplianceReport {
  standard: string;
  status: "non_compliant" | "partial" | "compliant";
  score: number;
  findings: ComplianceFinding[];
}

// === SBOM Types ===
export interface SBOM {
  format: "cyclonedx" | "spdx";
  components: SBOMComponent[];
  version: string;
}

export interface SBOMComponent {
  name: string;
  version: string;
  type: string;
  license?: string;
  supplier?: string;
}

// === Activity Types ===
export interface ActivityEvent {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  userName: string;
  userAvatar?: string;
  createdAt: string;
}

// === Notification Types ===
export interface Notification {
  id: string;
  type: "scan_complete" | "vulnerability_found" | "secret_leak" | "report_ready" | "dependency_update";
  title: string;
  message?: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// === Dashboard Stats ===
export interface DashboardStats {
  totalRepositories: number;
  totalAnalyses: number;
  openFindings: number;
  criticalFindings: number;
  averageSecurityScore: number;
  recentActivity: ActivityEvent[];
}
