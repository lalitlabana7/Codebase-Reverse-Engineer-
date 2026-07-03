import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { activityActionEnum } from "../enums";
import { organizations } from "./organizations";
import { users } from "./users";

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: activityActionEnum("action").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
