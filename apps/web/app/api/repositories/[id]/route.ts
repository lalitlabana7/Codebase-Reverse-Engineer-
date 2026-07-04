import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { repositoryService, analysisService, securityService, activityService } from "@/lib/services/database";
import { analyzeRepositorySync } from "@/lib/services/jobs";
import { eq, desc } from "drizzle-orm";
import { db, analyses } from "@codebuff/database";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const repo = await repositoryService.findById(id);

    if (!repo) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // Deferred analysis: if the most recent analysis is in "queued" or
    // "processing" state, run it inline right now.
    // This is more reliable on Vercel serverless than fire-and-forget
    // because the function stays alive until the HTTP response is sent.
    const latestAnalysis = await db
      .select()
      .from(analyses)
      .where(eq(analyses.repositoryId, id))
      .orderBy(desc(analyses.createdAt))
      .limit(1);

    if (
      latestAnalysis[0] &&
      (latestAnalysis[0].status === "queued" || latestAnalysis[0].status === "processing")
    ) {
      // Run analysis synchronously during this request
      await analyzeRepositorySync({
        repositoryId: id,
        analysisId: latestAnalysis[0].id,
        url: repo.url,
        branch: repo.defaultBranch || "main",
        userId: repo.userId,
      });
    }

    // Fetch related data in parallel
    const [analysesList, findings, score, secrets] = await Promise.all([
      analysisService.list(id),
      securityService.listFindings(id),
      securityService.getScore(id),
      securityService.listSecrets(id),
    ]);

    return NextResponse.json({
      repository: repo,
      analyses: analysesList,
      findings,
      score,
      secrets,
    });
  } catch (error: any) {
    console.error("Error fetching repository:", error);
    return NextResponse.json(
      { error: "Failed to fetch repository" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const repo = await repositoryService.findById(id);
    if (!repo) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // Validate it's a GitHub URL
    if (!repo.url.includes("github.com")) {
      return NextResponse.json({
        error: "Only GitHub repositories are supported.",
      }, { status: 400 });
    }

    // Reset clone status
    await repositoryService.update(id, { cloneStatus: "cloning" } as any);

    // Create new analysis record
    const [analysis] = await analysisService.create({
      repositoryId: id,
      type: "full",
    });

    await activityService.create({
      userId: repo.userId,
      action: "analysis_started",
      metadata: { repositoryId: id, url: repo.url },
    });

    return NextResponse.json({
      success: true,
      analysisId: analysis?.id,
      message: "Analysis queued. Open the repository to start analysis.",
    });
  } catch (error: any) {
    console.error("Error starting analysis:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start analysis" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await repositoryService.delete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting repository:", error);
    return NextResponse.json(
      { error: "Failed to delete repository" },
      { status: 500 }
    );
  }
}
