import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@codebuff/database";
import { initializeApp } from "@/lib/services/init";

export async function GET() {
  // Ensure the job queue is running (health endpoint is public, so this ensures
  // the queue starts even before any authenticated API route is called)
  initializeApp();
  let databaseStatus = "disconnected";

  try {
    // Run a lightweight query to verify the database is reachable
    await db.execute(sql`SELECT 1`);
    databaseStatus = "connected";
  } catch (err) {
    console.error("[health] Database connection check failed:", err);
  }

  return NextResponse.json({
    status: databaseStatus === "connected" ? "ok" : "degraded",
    database: databaseStatus,
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
