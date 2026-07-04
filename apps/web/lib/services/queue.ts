// Background Job Queue — simplified for Vercel serverless
// Analysis now runs synchronously via the GitHub API (inline in API routes).
// This queue wrapper is kept for future extensibility (e.g., Upstash QStash for larger repos).
// On Vercel, jobs are processed immediately within the HTTP request lifecycle.

import { db } from "@codebuff/database";
import { repositories, analyses } from "@codebuff/database";
import { eq, inArray } from "drizzle-orm";

class JobQueue {
  /**
   * Recover stuck jobs on server restart — reset repos stuck in "cloning"
   * Works on both Vercel and local environments.
   */
  async recoverStuckJobs() {
    try {
      const stuckRepos = await db
        .select({ id: repositories.id, name: repositories.name })
        .from(repositories)
        .where(eq(repositories.cloneStatus, "cloning"));

      for (const repo of stuckRepos) {
        await db
          .update(repositories)
          .set({ cloneStatus: "pending" as any, updatedAt: new Date() })
          .where(eq(repositories.id, repo.id));
        console.log(`[queue] Recovered stuck repo "${repo.name}" (was "cloning" → "pending")`);
      }

      const stuckAnalyses = await db
        .select({ id: analyses.id })
        .from(analyses)
        .where(inArray(analyses.status, ["processing"] as any));

      for (const a of stuckAnalyses) {
        await db
          .update(analyses)
          .set({
            status: "failed" as any,
            error: "Server restarted while job was running. Please re-run.",
          } as any)
          .where(eq(analyses.id, a.id));
        console.log(`[queue] Recovered stuck analysis ${a.id} (was "processing" → "failed")`);
      }

      if (stuckRepos.length > 0 || stuckAnalyses.length > 0) {
        console.log(`[queue] Recovery complete: ${stuckRepos.length} repos, ${stuckAnalyses.length} analyses`);
      }
    } catch (err) {
      console.error("[queue] Recovery failed:", err);
    }
  }

  /**
   * Legacy enqueue — kept for backwards compatibility.
   * On Vercel, analysis runs inline in the API route handler,
   * so this is mostly a no-op that returns a placeholder ID.
   */
  async enqueue(_type: string, data: Record<string, unknown>): Promise<string> {
    const analysisId = data.analysisId as string;
    if (analysisId) {
      return `analysis-${analysisId}`;
    }
    return `job-${Date.now()}`;
  }
}

export const jobQueue = new JobQueue();
