import { pgTable, uuid, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { notificationTypeEnum } from "../enums";
import { users } from "./users";

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  data: jsonb("data"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
