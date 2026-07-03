import { pgTable, uuid, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { complianceStandardEnum, complianceStatusEnum } from "../enums";
import { repositories } from "./repositories";

export const complianceReports = pgTable("compliance_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  standard: complianceStandardEnum("standard").notNull(),
  status: complianceStatusEnum("status").notNull(),
  score: decimal("score", { precision: 5, scale: 2 }),
  findings: jsonb("findings"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});
