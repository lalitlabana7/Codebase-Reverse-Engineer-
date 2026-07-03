import { pgTable, uuid, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { secretTypeEnum, severityEnum } from "../enums";
import { repositories } from "./repositories";

export const secrets = pgTable("secrets", {
  id: uuid("id").primaryKey().defaultRandom(),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  secretType: secretTypeEnum("secret_type").notNull(),
  valueHash: text("value_hash").notNull(),
  filePath: text("file_path").notNull(),
  lineStart: integer("line_start").notNull(),
  lineEnd: integer("line_end").notNull(),
  context: text("context"),
  severity: severityEnum("severity").notNull(),
  isRevoked: boolean("is_revoked").default(false),
  discoveredAt: timestamp("discovered_at").notNull().defaultNow(),
});
