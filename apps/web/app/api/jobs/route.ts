import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@codebuff/database";
import { repositories, analyses, users } from "@codebuff/database";
import { eq, and, sql, inArray } from "drizzle-orm";

const PROGRESS_STAGES = [
  { stage: "queued", label: "In Queue", progress: 5 },
  { stage: "cloning", label: "Cloning Repository", progress: 20 },
  { stage: "scanning", label: "Scanning Files", progress: 40 },
  { stage: "chunking", label: "Analyzing Code", progress: 60 },
  { stage: "security", label: "Running Security Checks", progress: 80 },
  { stage: "complete", label: "Complete", progress: 100 },
];

function getProgress(stage: string): { label: string; progress: number } {
  const found = PROGRESS_STAGES.find((s) => s.stage === stage);
  if (found) return { label: found.label, progress: found.progress };
  return { label: "Processing", progress: 50 };
}

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get internal user ID first (repositories.userId stores internal UUID, not Clerk ID)
    const userData = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
    if (!userData) {
      return NextResponse.json({ active: [], completed: 0, failed: 0 });
    }

    // Get user's repos
    const userRepos = await db
      .select({ id: repositories.id, name: repositories.name, url: repositories.url, cloneStatus: repositories.cloneStatus })
      .from(repositories)
      .where(eq(repositories.userId, userData.id));

    const repoIds = userRepos.map((r) => r.id);
    if (repoIds.length === 0) {
      return NextResponse.json({ active: [], completed: 0, failed: 0 });
    }

    // Get active analyses (queued or processing)
    const activeAnalyses = await db
      .select()
      .from(analyses)
      .where(
        and(
          inArray(analyses.repositoryId, repoIds),
          inArray(analyses.status, ["queued", "processing"] as any)
        )
      )
      .orderBy(sql`${analyses.createdAt} DESC`);

    // Get counts
    const completedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(analyses)
      .where(
        and(
          inArray(analyses.repositoryId, repoIds),
          eq(analyses.status, "completed" as any)
        )
      );

    const failedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(analyses)
      .where(
        and(
          inArray(analyses.repositoryId, repoIds),
          eq(analyses.status, "failed" as any)
        )
      );

    // Map to progress info
    const active = activeAnalyses.map((a) => {
      const repo = userRepos.find((r) => r.id === a.repositoryId);
      const technicalSummary = (a as any).technicalSummary as string | null;
      const currentStage = technicalSummary?.split(":")[0]?.trim() ?? a.status;
      const { label, progress } = getProgress(currentStage);

      return {
        id: a.id,
        repositoryId: a.repositoryId,
        repositoryName: repo?.name ?? "Unknown",
        status: a.status,
        stage: currentStage,
        stageLabel: label,
        progress,
        message: technicalSummary ?? "",
        createdAt: a.createdAt,
      };
    });

    return NextResponse.json({
      active,
      completed: Number(completedCount[0]?.count ?? 0),
      failed: Number(failedCount[0]?.count ?? 0),
    });
  } catch (error: any) {
    console.error("Error fetching job status:", error);
    return NextResponse.json({ error: "Failed to fetch job status" }, { status: 500 });
  }
}
