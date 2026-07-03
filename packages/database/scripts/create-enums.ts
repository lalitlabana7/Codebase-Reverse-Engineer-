import { neon } from "@neondatabase/serverless";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://neondb_owner:npg_BgKp5H7fmYEo@ep-icy-tooth-atmrr37x-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(connectionString);

const enumTypes = [
  "plan AS ENUM('free', 'pro', 'enterprise')",
  "clone_status AS ENUM('pending', 'cloning', 'cloned', 'failed')",
  "analysis_status AS ENUM('queued', 'processing', 'completed', 'failed')",
  "analysis_type AS ENUM('quick', 'full', 'scheduled')",
  "finding_type AS ENUM('vulnerability', 'secret', 'owasp', 'misconfig', 'cve')",
  "severity AS ENUM('critical', 'high', 'medium', 'low', 'info')",
  "finding_status AS ENUM('open', 'in_review', 'resolved', 'dismissed')",
  "risk_posture AS ENUM('low', 'medium', 'high', 'critical')",
  "trend AS ENUM('improving', 'stable', 'declining')",
  "dependency_type AS ENUM('npm', 'pip', 'go', 'cargo', 'maven', 'ruby', 'nuget', 'docker')",
  "chat_role AS ENUM('user', 'assistant', 'system')",
  "doc_type AS ENUM('readme', 'api_docs', 'install_guide', 'module_doc', 'onboarding_guide', 'dev_reference')",
  "doc_format AS ENUM('markdown', 'html', 'pdf')",
  "diagram_type AS ENUM('architecture', 'flowchart', 'dependency', 'sequence', 'entity_relationship', 'infrastructure', 'attack_surface')",
  "diagram_format AS ENUM('mermaid', 'd2', 'svg', 'png')",
  "secret_type AS ENUM('api_key', 'token', 'password', 'private_key', 'certificate', 'connection_string')",
  "compliance_standard AS ENUM('owasp_asvs', 'nist_80053', 'iso_27001', 'cis_controls')",
  "compliance_status AS ENUM('non_compliant', 'partial', 'compliant')",
  "sbom_format AS ENUM('cyclonedx', 'spdx')",
  "notification_type AS ENUM('scan_complete', 'vulnerability_found', 'secret_leak', 'report_ready', 'dependency_update')",
  "activity_action AS ENUM('repository_added', 'analysis_started', 'scan_completed', 'vulnerability_found', 'document_generated', 'diagram_created', 'chat_message')",
  "risk_level AS ENUM('low', 'medium', 'high', 'critical')",
];

async function main() {
  for (const enumDef of enumTypes) {
    const enumName = enumDef.split(" ")[0];
    try {
      await sql.query(`CREATE TYPE ${enumDef}`);
      console.log(`✅ Created: ${enumName}`);
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        console.log(`⏭️  Already exists: ${enumName}`);
      } else {
        console.error(`❌ Error creating ${enumName}:`, e.message);
      }
    }
  }
  console.log("\n✅ All enum types created!");
}

main().catch(console.error);
