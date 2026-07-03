import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { analysisTypeEnum, analysisStatusEnum } from "../enums";
import { repositories } from "./repositories";

export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  type: analysisTypeEnum("type").notNull().default("full"),
  status: analysisStatusEnum("status").notNull().default("queued"),
  summary: jsonb("summary"),
  folderStructure: jsonb("folder_structure"),
  importantFiles: jsonb("important_files"),
  technologies: jsonb("technologies"),
  architecturePatterns: jsonb("architecture_patterns"),
  technicalSummary: text("technical_summary"),
  beginnerSummary: text("beginner_summary"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
