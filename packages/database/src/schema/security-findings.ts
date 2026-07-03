import { pgTable, uuid, text, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { findingTypeEnum, severityEnum, findingStatusEnum } from "../enums";
import { repositories } from "./repositories";
import { analyses } from "./analyses";

export const securityFindings = pgTable("security_findings", {
  id: uuid("id").primaryKey().defaultRandom(),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  analysisId: uuid("analysis_id").references(() => analyses.id, { onDelete: "set null" }),
  type: findingTypeEnum("type").notNull(),
  severity: severityEnum("severity").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  filePath: text("file_path"),
  lineStart: integer("line_start"),
  lineEnd: integer("line_end"),
  codeSnippet: text("code_snippet"),
  cveId: text("cve_id"),
  owaspCategory: text("owasp_category"),
  recommendation: text("recommendation"),
  fixExample: text("fix_example"),
  isFalsePositive: boolean("is_false_positive").default(false),
  status: findingStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
