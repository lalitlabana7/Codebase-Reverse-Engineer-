// App Initialization - Register background job handlers & recover stuck jobs
import { registerAllJobs } from "./jobs";
import { jobQueue } from "./queue";

let initialized = false;

/**
 * Synchronously register job handlers & start the queue.
 * Recovery of stuck jobs happens as fire-and-forget so it never races
 * against newly created analyses.
 */
export function initializeApp(): void {
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
