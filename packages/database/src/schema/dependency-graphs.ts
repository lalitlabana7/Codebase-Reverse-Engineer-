import { pgTable, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";
import { repositories } from "./repositories";

export const dependencyGraphs = pgTable("dependency_graphs", {
  id: uuid("id").primaryKey().defaultRandom(),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  graphData: jsonb("graph_data").notNull(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});
