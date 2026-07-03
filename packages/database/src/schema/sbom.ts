import { pgTable, uuid, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { sbomFormatEnum } from "../enums";
import { repositories } from "./repositories";

export const sbom = pgTable("sbom", {
  id: uuid("id").primaryKey().defaultRandom(),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  format: sbomFormatEnum("format").notNull(),
  content: jsonb("content").notNull(),
  version: text("version").notNull(),
  componentCount: integer("component_count").notNull(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});
