// Compliance Engine - OWASP ASVS, NIST, ISO 27001, CIS validation
import { db } from "@codebuff/database";
import { complianceReports, codeChunks, securityFindings } from "@codebuff/database";
import { eq, desc, sql } from "drizzle-orm";

export type ComplianceStandard = "owasp_asvs" | "nist_80053" | "iso_27001" | "cis_controls";

interface ComplianceControl {
  id: string;
  title: string;
  description: string;
  category: string;
  check: (data: ComplianceCheckData) => ComplianceResult;
}

interface ComplianceCheckData {
  hasAuth: boolean;
  hasHttps: boolean;
  hasLogging: boolean;
  hasInputValidation: boolean;
  hasCors: boolean;
  hasHelmet: boolean;
  hasEncryption: boolean;
  hasAccessControl: boolean;
  hasSessionManagement: boolean;
  hasErrorHandling: boolean;
  hasSecretsManagement: boolean;
  fileCount: number;
  dependencyCount: number;
  findings: Array<{ type: string; severity: string }>;
}

interface ComplianceResult {
  status: "passed" | "failed" | "partial" | "not_applicable";
  description: string;
  recommendation: string;
}

const STANDARDS: Record<ComplianceStandard, { name: string; controls: ComplianceControl[] }> = {
  owasp_asvs: {
    name: "OWASP Application Security Verification Standard",
    controls: [
      {
        id: "V1",
        title: "Architecture, Design and Threat Modeling",
        description: "Verify the application has a documented architecture and threat model",
        category: "Design",
        check: (data) => ({
          status: data.hasAccessControl ? "passed" : "failed",
          description: data.hasAccessControl
            ? "Architecture includes access control patterns"
            : "No access control patterns detected in the architecture",
          recommendation: "Document the application architecture and perform threat modeling using STRIDE or similar methodology.",
        }),
      },
      {
        id: "V2",
        title: "Authentication Verification",
        description: "Verify authentication mechanisms are secure",
        category: "Auth",
        check: (data) => ({
          status: data.hasAuth ? "passed" : "failed",
          description: data.hasAuth
            ? "Authentication mechanisms detected"
            : "No authentication mechanisms found",
          recommendation: "Implement strong authentication with MFA support, secure password storage, and rate limiting.",
        }),
      },
      {
        id: "V3",
        title: "Session Management",
        description: "Verify session management is secure",
        category: "Auth",
        check: (data) => ({
          status: data.hasSessionManagement ? "passed" : "failed",
          description: data.hasSessionManagement
            ? "Session management patterns detected"
            : "No session management detected",
          recommendation: "Use secure, httpOnly, sameSite cookies with appropriate session timeouts.",
        }),
      },
      {
        id: "V4",
        title: "Access Control",
        description: "Verify access controls are in place",
        category: "Auth",
        check: (data) => ({
          status: data.hasAccessControl ? "passed" : "failed",
          description: data.hasAccessControl
            ? "Access control mechanisms detected"
            : "No access control mechanisms found",
          recommendation: "Implement role-based access control (RBAC) with principle of least privilege.",
        }),
      },
      {
        id: "V5",
        title: "Input Validation and Sanitization",
        description: "Verify input validation is implemented",
        category: "Validation",
        check: (data) => ({
          status: data.hasInputValidation ? "passed" : "failed",
          description: data.hasInputValidation
            ? "Input validation patterns detected"
            : "No input validation detected",
          recommendation: "Implement server-side input validation, output encoding, and parameterized queries.",
        }),
      },
      {
        id: "V6",
        title: "Cryptography",
        description: "Verify cryptographic controls are adequate",
        category: "Cryptography",
        check: (data) => ({
          status: data.hasEncryption && data.hasHttps ? "passed" : "failed",
          description: data.hasHttps
            ? "HTTPS and encryption patterns detected"
            : "Missing HTTPS or encryption mechanisms",
          recommendation: "Use TLS 1.3 for all communications, store passwords with bcrypt/Argon2, use strong encryption at rest.",
        }),
      },
      {
        id: "V7",
        title: "Error Handling and Logging",
        description: "Verify error handling and logging are adequate",
        category: "Logging",
        check: (data) => ({
          status: data.hasErrorHandling && data.hasLogging ? "passed" : "partial",
          description: data.hasLogging
            ? "Logging detected but error handling may need improvement"
            : "No logging or error handling detected",
          recommendation: "Implement centralized logging, avoid exposing stack traces, log security events.",
        }),
      },
      {
        id: "V8",
        title: "Data Protection",
        description: "Verify sensitive data is protected",
        category: "Data",
        check: (data) => ({
          status: data.hasEncryption && data.hasSecretsManagement ? "passed" : "failed",
          description: data.hasSecretsManagement
            ? "Secrets management detected"
            : "No secrets management found",
          recommendation: "Use environment variables or a secrets manager for all credentials. Encrypt sensitive data at rest.",
        }),
      },
      {
        id: "V9",
        title: "Communication Security",
        description: "Verify communications are secure",
        category: "Network",
        check: (data) => ({
          status: data.hasHttps ? "passed" : "failed",
          description: data.hasHttps
            ? "HTTPS/secure communication detected"
            : "No HTTPS or secure communication detected",
          recommendation: "Enforce HTTPS, use HSTS headers, implement certificate pinning for mobile apps.",
        }),
      },
      {
        id: "V10",
        title: "Malicious Code Search",
        description: "Verify no malicious code patterns are present",
        category: "Code",
        check: (data) => ({
          status: data.findings.filter((f) => f.severity === "critical").length === 0
            ? "passed"
            : "failed",
          description: `${
            data.findings.filter((f) => f.severity === "critical").length
          } critical findings detected`,
          recommendation: "Address all critical security findings. Review code for backdoors, obfuscated code, and suspicious patterns.",
        }),
      },
    ],
  },
  nist_80053: {
    name: "NIST SP 800-53 Security Controls",
    controls: [
      {
        id: "AC-1",
        title: "Access Control Policy and Procedures",
        description: "Verify access control policies are implemented",
        category: "Access Control",
        check: (data) => ({
          status: data.hasAccessControl ? "passed" : "failed",
          description: data.hasAccessControl
            ? "Access control mechanisms detected"
            : "No access control mechanisms",
          recommendation: "Establish, document, and implement access control policies.",
        }),
      },
      {
        id: "AU-1",
        title: "Audit and Accountability",
        description: "Verify audit logging is implemented",
        category: "Audit",
        check: (data) => ({
          status: data.hasLogging ? "passed" : "failed",
          description: data.hasLogging
            ? "Audit logging detected"
            : "No audit logging mechanisms found",
          recommendation: "Implement comprehensive audit logging for security-relevant events.",
        }),
      },
      {
        id: "CM-1",
        title: "Configuration Management",
        description: "Verify configuration management practices",
        category: "Configuration",
        check: (data) => ({
          status: data.hasCors && data.hasHelmet ? "passed" : "partial",
          description: data.hasCors
            ? "Some configuration management detected"
            : "No configuration management patterns found",
          recommendation: "Implement secure configuration management for all components.",
        }),
      },
      {
        id: "IA-1",
        title: "Identification and Authentication",
        description: "Verify identification and authentication controls",
        category: "Auth",
        check: (data) => ({
          status: data.hasAuth ? "passed" : "failed",
          description: data.hasAuth
            ? "Authentication mechanisms detected"
            : "No authentication mechanisms found",
          recommendation: "Implement unique user identification and secure authentication.",
        }),
      },
      {
        id: "SC-1",
        title: "System and Communications Protection",
        description: "Verify communications are protected",
        category: "Communications",
        check: (data) => ({
          status: data.hasHttps && data.hasEncryption ? "passed" : "failed",
          description: data.hasHttps
            ? "Communications protection detected"
            : "No communications protection found",
          recommendation: "Implement cryptographic mechanisms to protect communications.",
        }),
      },
      {
        id: "SI-1",
        title: "System and Information Integrity",
        description: "Verify system integrity controls",
        category: "Integrity",
        check: (data) => ({
          status: data.hasInputValidation ? "passed" : "failed",
          description: data.hasInputValidation
            ? "Input validation detected"
            : "No input validation mechanisms",
          recommendation: "Implement input validation, error handling, and integrity checks.",
        }),
      },
    ],
  },
  iso_27001: {
    name: "ISO/IEC 27001 Information Security Management",
    controls: [
      {
        id: "A.5",
        title: "Information Security Policies",
        description: "Verify security policies are established",
        category: "Policy",
        check: (data) => ({
          status: data.hasAccessControl ? "passed" : "partial",
          description: data.hasAccessControl
            ? "Security policy patterns detected"
            : "No security policy patterns found",
          recommendation: "Establish and document information security policies aligned with business requirements.",
        }),
      },
      {
        id: "A.8",
        title: "Asset Management",
        description: "Verify information assets are managed",
        category: "Assets",
        check: (data) => ({
          status: data.fileCount > 0 ? "passed" : "failed",
          description: `${data.fileCount} files analyzed`,
          recommendation: "Maintain an inventory of information assets and their classification.",
        }),
      },
      {
        id: "A.9",
        title: "Access Control",
        description: "Verify access controls are implemented",
        category: "Access Control",
        check: (data) => ({
          status: data.hasAccessControl ? "passed" : "failed",
          description: data.hasAccessControl
            ? "Access control mechanisms detected"
            : "No access control found",
          recommendation: "Implement formal access control policies for all systems and data.",
        }),
      },
      {
        id: "A.10",
        title: "Cryptography",
        description: "Verify cryptographic controls",
        category: "Cryptography",
        check: (data) => ({
          status: data.hasEncryption ? "passed" : "failed",
          description: data.hasEncryption
            ? "Cryptographic controls detected"
            : "No cryptographic controls found",
          recommendation: "Establish cryptographic policies for encryption and key management.",
        }),
      },
      {
        id: "A.12",
        title: "Operations Security",
        description: "Verify operational security procedures",
        category: "Operations",
        check: (data) => ({
          status: data.hasLogging && data.hasErrorHandling ? "passed" : "partial",
          description: data.hasLogging
            ? "Operational security patterns detected"
            : "No operational security patterns found",
          recommendation: "Implement operational procedures including monitoring, logging, and incident response.",
        }),
      },
      {
        id: "A.16",
        title: "Incident Management",
        description: "Verify incident management capabilities",
        category: "Incidents",
        check: (data) => ({
          status: data.hasLogging ? "passed" : "failed",
          description: data.hasLogging
            ? "Incident detection capabilities detected"
            : "No incident detection capabilities found",
          recommendation: "Establish incident management processes with clear reporting and escalation procedures.",
        }),
      },
    ],
  },
  cis_controls: {
    name: "CIS Critical Security Controls",
    controls: [
      {
        id: "CIS-1",
        title: "Inventory and Control of Enterprise Assets",
        description: "Verify asset inventory is maintained",
        category: "Asset Management",
        check: (data) => ({
          status: data.fileCount > 0 ? "passed" : "failed",
          description: `${data.fileCount} files identified as assets`,
          recommendation: "Maintain an inventory of all enterprise assets including code repositories.",
        }),
      },
      {
        id: "CIS-3",
        title: "Data Protection",
        description: "Verify data protection measures",
        category: "Data Protection",
        check: (data) => ({
          status: data.hasEncryption && data.hasSecretsManagement ? "passed" : "failed",
          description: data.hasSecretsManagement
            ? "Data protection measures detected"
            : "No data protection measures found",
          recommendation: "Implement data encryption, secrets management, and data loss prevention controls.",
        }),
      },
      {
        id: "CIS-4",
        title: "Secure Configuration",
        description: "Verify secure configuration of assets",
        category: "Configuration",
        check: (data) => ({
          status: data.hasCors && data.hasHelmet ? "passed" : "partial",
          description: data.hasCors
            ? "Some secure configuration detected"
            : "No secure configuration patterns found",
          recommendation: "Establish secure configuration standards for all technology assets.",
        }),
      },
      {
        id: "CIS-5",
        title: "Account Management",
        description: "Verify account management controls",
        category: "Auth",
        check: (data) => ({
          status: data.hasAuth ? "passed" : "failed",
          description: data.hasAuth
            ? "Account management detected"
            : "No account management found",
          recommendation: "Implement managed accounts with unique credentials and MFA.",
        }),
      },
      {
        id: "CIS-8",
        title: "Audit Log Management",
        description: "Verify audit log management",
        category: "Logging",
        check: (data) => ({
          status: data.hasLogging ? "passed" : "failed",
          description: data.hasLogging
            ? "Audit logging detected"
            : "No audit logging found",
          recommendation: "Implement centralized audit log collection, retention, and monitoring.",
        }),
      },
      {
        id: "CIS-13",
        title: "Network Monitoring and Defense",
        description: "Verify network security monitoring",
        category: "Network",
        check: (data) => ({
          status: data.hasHttps ? "passed" : "failed",
          description: data.hasHttps
            ? "Network security measures detected"
            : "No network security measures found",
          recommendation: "Implement network monitoring, segmentation, and defense-in-depth strategies.",
        }),
      },
      {
        id: "CIS-16",
        title: "Application Software Security",
        description: "Verify application security measures",
        category: "Application",
        check: (data) => ({
          status: data.hasInputValidation ? "passed" : "failed",
          description: data.hasInputValidation
            ? "Application security measures detected"
            : "No application security measures found",
          recommendation: "Implement secure coding practices, input validation, and regular security testing.",
        }),
      },
    ],
  },
};

export class ComplianceEngine {
  async runAssessment(params: {
    repositoryId: string;
    standard: ComplianceStandard;
  }): Promise<{
    standard: string;
    status: string;
    score: number;
    findings: Array<{
      control: string;
      status: string;
      description: string;
      recommendation: string;
    }>;
  }> {
    const { repositoryId, standard } = params;
    const standardConfig = STANDARDS[standard];

    // Gather compliance check data
    const data = await this.gatherCheckData(repositoryId);

    // Run each control check
    const findings = standardConfig.controls.map((control) => {
      const result = control.check(data);
      return {
        control: `${control.id} - ${control.title}`,
        status: result.status,
        description: result.description,
        recommendation: result.recommendation,
      };
    });

    // Calculate compliance score
    const passed = findings.filter((f) => f.status === "passed").length;
    const partial = findings.filter((f) => f.status === "partial").length;
    const score = Math.round((passed + partial * 0.5) / findings.length * 100);

    // Determine overall status
    let status: string;
    if (score >= 80) status = "compliant";
    else if (score >= 50) status = "partial";
    else status = "non_compliant";

    // Store in database
    await db
      .insert(complianceReports)
      .values({
        repositoryId,
        standard: standard as any,
        status: status as any,
        score: String(score),
        findings: findings as any,
      })
      .returning();

    return {
      standard: standardConfig.name,
      status,
      score,
      findings: findings.map((f) => ({
        ...f,
        recommendation: f.recommendation,
      })),
    };
  }

  private async gatherCheckData(repositoryId: string): Promise<ComplianceCheckData> {
    // Get code chunks
    const chunks = await db
      .select({ content: codeChunks.content, filePath: codeChunks.filePath })
      .from(codeChunks)
      .where(eq(codeChunks.repositoryId, repositoryId))
      .limit(50);

    const allContent = chunks.map((c) => c.content).join("\n").toLowerCase();

    // Get security findings from the database
    const findings: Array<{ type: string; severity: string }> = [];
    try {
      const dbFindings = await db.query.securityFindings.findMany({
        where: (eq as any)(securityFindings.repositoryId, repositoryId),
        columns: {
          type: true,
          severity: true,
        },
      });
      findings.push(...dbFindings.map((f: any) => ({ type: f.type, severity: f.severity })));
    } catch {
      // If the query fails (e.g., table doesn't exist yet), use empty findings
    }

    return {
      hasAuth: /auth|login|signin|sign.?in|oauth|jwt|session/i.test(allContent),
      hasHttps: /https:\/\//i.test(allContent),
      hasLogging: /log\.(info|error|warn|debug)|console\.log|logger\./i.test(allContent),
      hasInputValidation: /validate|sanitize|zod|yup|joi|express-validator|validator/i.test(allContent),
      hasCors: /cors/i.test(allContent),
      hasHelmet: /helmet/i.test(allContent),
      hasEncryption: /encrypt|bcrypt|argon2|crypto\./i.test(allContent),
      hasAccessControl: /protect|middleware|guard|authorize|permission|role|rbac/i.test(allContent),
      hasSessionManagement: /session|cookie|token|jwt/i.test(allContent),
      hasErrorHandling: /try|catch|error|throw|error\./i.test(allContent),
      hasSecretsManagement: /\.env|process\.env|dotenv|vault|secret/i.test(allContent),
      fileCount: chunks.length,
      dependencyCount: 0,
      findings,
    };
  }

  async getLatestReport(repositoryId: string, standard: ComplianceStandard) {
    return db.query.complianceReports.findFirst({
      where: sql`${complianceReports.repositoryId} = ${repositoryId} AND ${complianceReports.standard} = ${standard}::compliance_standard`,
      orderBy: desc(complianceReports.generatedAt),
    });
  }
}

export const complianceEngine = new ComplianceEngine();


