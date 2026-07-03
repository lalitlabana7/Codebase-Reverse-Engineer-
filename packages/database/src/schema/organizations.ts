import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { planEnum } from "../enums";
import { users } from "./users";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: planEnum("plan").notNull().default("free"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
