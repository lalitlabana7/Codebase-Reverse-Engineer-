// App Initialization - Register background job handlers & recover stuck jobs
import { registerAllJobs } from "./jobs";
import { jobQueue } from "./queue";

let initialized = false;

/**
 * Synchronously register job handlers & start the queue.
 * Recovery of stuck jobs happens as fire-and-forget so it never races
 * against newly created analyses.
 *
 * Guards against:
 *  - Missing DATABASE_URL (common during Next.js build / static generation)
 *  - Vercel serverless / edge runtime (background jobs won't persist)
 */
export function initializeApp(): void {
  // Never run during Next.js build / static generation
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  // On Vercel serverless, background polling queue won't persist
  if (process.env.VERCEL) {
    console.log("[ACRE] Vercel environment detected — skipping background job queue");
    return;
  }

  // Skip if no database URL is configured
  if (!process.env.DATABASE_URL) {
    console.warn("[ACRE] DATABASE_URL not set — skipping initialization");
    return;
  }

  if (initialized) return;
  initialized = true;

  try {
    // Register background job handlers (synchronous)
    registerAllJobs();

    // Start the persistent job processing loop (synchronous)
    jobQueue.start();

    // Fire-and-forget: recover stuck jobs in background AFTER queue is running
    // Only affects "processing" analyses (not "queued"), so no race with new jobs
    jobQueue.recoverStuckJobs().catch((err) =>
      console.error("[ACRE] Recovery failed:", err)
    );

    console.log("[ACRE] System initialized: handlers registered, queue started");
  } catch (error) {
    console.error("[ACRE] Failed to initialize system:", error);
  }
}
