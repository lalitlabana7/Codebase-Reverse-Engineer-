import { pgTable, uuid, text, timestamp, integer, bigint, boolean } from "drizzle-orm/pg-core";
import { cloneStatusEnum } from "../enums";
import { users } from "./users";
import { organizations } from "./organizations";

export const repositories = pgTable("repositories", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  fullName: text("full_name"),
  url: text("url").notNull(),
  defaultBranch: text("default_branch").default("main"),
  description: text("description"),
  language: text("language"),
  topics: text("topics").array(),
  stars: integer("stars").default(0),
  isPrivate: boolean("is_private").default(false),
  clonedAt: timestamp("cloned_at"),
  cloneStatus: cloneStatusEnum("clone_status").default("pending"),
  size: bigint("size", { mode: "number" }),
  fileCount: integer("file_count"),
  lastAnalysisAt: timestamp("last_analysis_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
