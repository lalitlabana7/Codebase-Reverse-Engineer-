import { pgTable, uuid, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { repositories } from "./repositories";
import { users } from "./users";

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  isActive: boolean("is_active").notNull().default(true),
  messageCount: integer("message_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
