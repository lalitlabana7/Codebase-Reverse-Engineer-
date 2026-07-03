import { neon } from "@neondatabase/serverless";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://neondb_owner:npg_BgKp5H7fmYEo@ep-icy-tooth-atmrr37x-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(connectionString);

async function main() {
  // Enable pgvector extension
  try {
    await sql.query("CREATE EXTENSION IF NOT EXISTS vector");
    console.log("✅ pgvector extension enabled");
  } catch (e: any) {
    console.error("❌ Error enabling pgvector:", e.message);
  }

  console.log("\n✅ Database setup complete!");
}

main().catch(console.error);
