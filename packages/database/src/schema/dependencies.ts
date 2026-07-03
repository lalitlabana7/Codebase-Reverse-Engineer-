import { pgTable, uuid, text, timestamp, boolean, decimal, jsonb } from "drizzle-orm/pg-core";
import { dependencyTypeEnum } from "../enums";
import { repositories } from "./repositories";

export const dependencies = pgTable("dependencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  version: text("version").notNull(),
  latestVersion: text("latest_version"),
  type: dependencyTypeEnum("type").notNull(),
  isDirect: boolean("is_direct").notNull().default(true),
  isDevDependency: boolean("is_dev_dependency").default(false),
  description: text("description"),
  homepage: text("homepage"),
  license: text("license"),
  isOutdated: boolean("is_outdated").default(false),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  vulnerabilities: jsonb("vulnerabilities"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
