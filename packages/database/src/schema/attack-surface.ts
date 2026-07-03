import { pgTable, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";
import { riskLevelEnum } from "../enums";
import { repositories } from "./repositories";

export const attackSurface = pgTable("attack_surface", {
  id: uuid("id").primaryKey().defaultRandom(),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  entryPoints: jsonb("entry_points"),
  authenticationZones: jsonb("authentication_zones"),
  exposedServices: jsonb("exposed_services"),
  sensitiveFiles: jsonb("sensitive_files"),
  dataFlows: jsonb("data_flows"),
  threatModels: jsonb("threat_models"),
  mitreAttackMappings: jsonb("mitre_attack_mappings"),
  riskLevel: riskLevelEnum("risk_level").notNull().default("medium"),
  analyzedAt: timestamp("analyzed_at").notNull().defaultNow(),
});
