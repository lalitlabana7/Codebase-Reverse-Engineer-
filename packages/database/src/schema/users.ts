import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { planEnum } from "../enums";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  plan: planEnum("plan").notNull().default("free"),
  credits: integer("credits").notNull().default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
