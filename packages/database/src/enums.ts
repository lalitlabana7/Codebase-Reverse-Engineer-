import { pgEnum } from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan", ["free", "pro", "enterprise"]);
export const cloneStatusEnum = pgEnum("clone_status", ["pending", "cloning", "cloned", "failed"]);
export const analysisStatusEnum = pgEnum("analysis_status", ["queued", "processing", "completed", "failed"]);
export const analysisTypeEnum = pgEnum("analysis_type", ["quick", "full", "scheduled"]);
export const findingTypeEnum = pgEnum("finding_type", ["vulnerability", "secret", "owasp", "misconfig", "cve"]);
export const severityEnum = pgEnum("severity", ["critical", "high", "medium", "low", "info"]);
export const findingStatusEnum = pgEnum("finding_status", ["open", "in_review", "resolved", "dismissed"]);
export const riskPostureEnum = pgEnum("risk_posture", ["low", "medium", "high", "critical"]);
export const trendEnum = pgEnum("trend", ["improving", "stable", "declining"]);
export const dependencyTypeEnum = pgEnum("dependency_type", ["npm", "pip", "go", "cargo", "maven", "ruby", "nuget", "docker"]);
export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant", "system"]);
export const docTypeEnum = pgEnum("doc_type", ["readme", "api_docs", "install_guide", "module_doc", "onboarding_guide", "dev_reference"]);
export const docFormatEnum = pgEnum("doc_format", ["markdown", "html", "pdf"]);
export const diagramTypeEnum = pgEnum("diagram_type", ["architecture", "flowchart", "dependency", "sequence", "entity_relationship", "infrastructure", "attack_surface"]);
export const diagramFormatEnum = pgEnum("diagram_format", ["mermaid", "d2", "svg", "png"]);
export const secretTypeEnum = pgEnum("secret_type", ["api_key", "token", "password", "private_key", "certificate", "connection_string"]);
export const complianceStandardEnum = pgEnum("compliance_standard", ["owasp_asvs", "nist_80053", "iso_27001", "cis_controls"]);
export const complianceStatusEnum = pgEnum("compliance_status", ["non_compliant", "partial", "compliant"]);
export const sbomFormatEnum = pgEnum("sbom_format", ["cyclonedx", "spdx"]);
export const notificationTypeEnum = pgEnum("notification_type", ["scan_complete", "vulnerability_found", "secret_leak", "report_ready", "dependency_update"]);
export const activityActionEnum = pgEnum("activity_action", [
  "repository_added", "analysis_started", "scan_completed",
  "vulnerability_found", "document_generated", "diagram_created", "chat_message",
]);
export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high", "critical"]);
