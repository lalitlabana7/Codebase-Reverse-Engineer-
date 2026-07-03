import { pgTable, uuid, text, timestamp, integer, jsonb, vector } from "drizzle-orm/pg-core";
import { repositories } from "./repositories";

export const codeChunks = pgTable("code_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  metadata: jsonb("metadata"),
  tokenCount: integer("token_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
