import { pgTable, uuid, timestamp, decimal } from "drizzle-orm/pg-core";
import { riskPostureEnum, trendEnum } from "../enums";
import { repositories } from "./repositories";

export const securityScores = pgTable("security_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  overall: decimal("overall", { precision: 5, scale: 2 }).notNull(),
  codeQuality: decimal("code_quality", { precision: 5, scale: 2 }).notNull(),
  dependencyHealth: decimal("dependency_health", { precision: 5, scale: 2 }).notNull(),
  architectureScore: decimal("architecture_score", { precision: 5, scale: 2 }).notNull(),
  vulnerabilityScore: decimal("vulnerability_score", { precision: 5, scale: 2 }).notNull(),
  riskPosture: riskPostureEnum("risk_posture").notNull(),
  trend: trendEnum("trend").notNull().default("stable"),
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
});
