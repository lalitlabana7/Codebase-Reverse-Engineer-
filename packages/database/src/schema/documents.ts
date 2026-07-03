import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { docTypeEnum, docFormatEnum } from "../enums";
import { repositories } from "./repositories";

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  type: docTypeEnum("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  format: docFormatEnum("format").notNull().default("markdown"),
  status: text("status").notNull().default("draft"),
  version: integer("version").notNull().default(1),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
