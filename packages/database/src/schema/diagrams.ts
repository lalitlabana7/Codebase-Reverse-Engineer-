import { pgTable, uuid, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { diagramTypeEnum, diagramFormatEnum } from "../enums";
import { repositories } from "./repositories";

export const diagrams = pgTable("diagrams", {
  id: uuid("id").primaryKey().defaultRandom(),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  type: diagramTypeEnum("type").notNull(),
  title: text("title").notNull(),
  data: jsonb("data").notNull(),
  format: diagramFormatEnum("format").notNull().default("mermaid"),
  thumbnailUrl: text("thumbnail_url"),
  isInteractive: boolean("is_interactive").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
