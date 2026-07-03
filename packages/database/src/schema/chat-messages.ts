import { pgTable, uuid, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { chatRoleEnum } from "../enums";
import { chatSessions } from "./chat-sessions";

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: chatRoleEnum("role").notNull(),
  content: text("content").notNull(),
  sources: jsonb("sources"),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
