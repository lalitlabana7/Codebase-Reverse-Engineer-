// Background Job Queue — Database-Persistent Queue
// Uses the analyses table in the database to survive server restarts
import { analysisService, repositoryService } from "./database";
import { db } from "@codebuff/database";
import { repositories, analyses } from "@codebuff/database";
import { eq, inArray } from "drizzle-orm";

type JobHandler = (job: Job) => Promise<void>;

export interface Job {
  id: string;
  type: string;
  data: Record<string, unknown>;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  error?: string;
  result?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

class JobQueue {
  private handlers: Map<string, JobHandler> = new Map();
  private running = false;

  register(type: string, handler: JobHandler) {
    this.handlers.set(type, handler);
  }

  /** Recover stuck jobs on server restart — reset repos stuck in "cloning" */
  async recoverStuckJobs() {
    try {
      const stuckRepos = await db
        .select({ id: repositories.id, name: repositories.name })
        .from(repositories)
        .where(eq(repositories.cloneStatus, "cloning"));

      for (const repo of stuckRepos) {
        await repositoryService.update(repo.id, { cloneStatus: "pending" });
        console.log(`[queue] Recovered stuck repo "${repo.name}" (was "cloning" → "pending")`);
      }

      const stuckAnalyses = await db
        .select({ id: analyses.id })
        .from(analyses)
        .where(inArray(analyses.status, ["processing"] as any));

      for (const a of stuckAnalyses) {
        await analysisService.updateStatus(a.id, "failed", {
          error: "Server restarted while job was running. Please re-run.",
        } as any);
        console.log(`[queue] Recovered stuck analysis ${a.id} (was "processing" → "failed")`);
      }

      if (stuckRepos.length > 0 || stuckAnalyses.length > 0) {
        console.log(`[queue] Recovery complete: ${stuckRepos.length} repos, ${stuckAnalyses.length} analyses`);
      }
    } catch (err) {
      console.error("[queue] Recovery failed:", err);
    }
  }

  /** Start the processing loop — polls DB every second for queued jobs */
  start() {
    if (this.running) return;

    // Don't start if no database URL is configured
    if (!process.env.DATABASE_URL) {
      console.warn("[queue] DATABASE_URL not set — queue not started");
      return;
    }

    this.running = true;
    console.log("[queue] Job processing loop started");
    this.pollNext();
  }

  stop() {
    this.running = false;
  }

  private async pollNext() {
    if (!this.running) return;

    // Safety check: if DATABASE_URL was removed at runtime, stop polling
    if (!process.env.DATABASE_URL) {
      console.warn("[queue] DATABASE_URL not set — stopping queue");
      this.running = false;
      return;
    }

    try {
      const pending = await db
        .select()
        .from(analyses)
        .where(eq(analyses.status, "queued" as any))
        .limit(1);

      if (pending.length > 0) {
        const analysis = pending[0]!;

        // Find the repo to get the URL
        const repo = await repositoryService.findById(analysis.repositoryId);
        if (!repo) {
          await analysisService.updateStatus(analysis.id, "failed", {
            error: "Repository not found",
          } as any);
        } else {
          const handler = this.handlers.get("analyze_repository");
          if (!handler) {
            await analysisService.updateStatus(analysis.id, "failed", {
              error: "No handler registered for analyze_repository",
            } as any);
          } else {

        const job: Job = {
          id: `analysis-${analysis.id}`,
          type: "analyze_repository",
          data: {
            repositoryId: analysis.repositoryId,
            analysisId: analysis.id,
            url: repo.url,
            branch: repo.defaultBranch || "main",
            userId: repo.userId,
          },
          status: "processing",
          progress: 0,
          createdAt: analysis.createdAt,
          updatedAt: new Date(),
        };

            // Mark as processing
            await analysisService.updateStatus(analysis.id, "processing");

            // Fire-and-forget: run the handler asynchronously so the queue
            // can continue polling for new jobs. The handler manages its own
            // completion/failure updates internally via try/catch.
            handler(job).catch((err: Error) => {
              console.error(`[queue] Unhandled job error for ${job.id}:`, err);
            });
          }
        }
      }
    } catch (err) {
      console.error("[queue] Poll error:", err);
    }

    // Always reschedule immediately — don't wait for the handler to finish.
    // This allows multiple jobs to run concurrently and prevents the queue
    // from blocking HTTP request handling.
    this.scheduleNext();
  }

  private scheduleNext() {
    if (!this.running) return;
    setTimeout(() => this.pollNext(), 1000);
  }

  // Legacy — kept for backwards compat. Jobs are now created via the analyses table.
  async enqueue(_type: string, data: Record<string, unknown>): Promise<string> {
    const analysisId = data.analysisId as string;
    if (analysisId) {
      if (!this.running) this.start();
      return `analysis-${analysisId}`;
    }
    return `job-${Date.now()}`;
  }

  getQueueStatus(): { queued: number; processing: number; completed: number; failed: number } {
    return { queued: 0, processing: 0, completed: 0, failed: 0 };
  }
}

export const jobQueue = new JobQueue();
