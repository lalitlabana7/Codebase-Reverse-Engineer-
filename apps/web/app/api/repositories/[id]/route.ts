import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { repositoryService, analysisService, securityService, activityService } from "@/lib/services/database";
import { jobQueue } from "@/lib/services/queue";
import { initializeApp } from "@/lib/services/init";

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

    // Fetch related data in parallel
    const [analyses, findings, score, secrets] = await Promise.all([
      analysisService.list(id),
      securityService.listFindings(id),
      securityService.getScore(id),
      securityService.listSecrets(id),
    ]);

    return NextResponse.json({
      repository: repo,
      analyses,
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Initialize background job queue for analysis
    initializeApp();

    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const repo = await repositoryService.findById(id);
    if (!repo) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // Reset clone status
    await repositoryService.update(id, { cloneStatus: "cloning" });

    // Create new analysis record (the polling queue picks it up automatically)
    const [analysis] = await analysisService.create({
      repositoryId: id,
      type: "full",
    });

    // Ensure queue is running and notify it about the new analysis
    await jobQueue.enqueue("analyze_repository", {
      repositoryId: id,
      analysisId: analysis?.id,
      url: repo.url,
      branch: repo.defaultBranch || "main",
      userId: repo.userId,
    });

    await activityService.create({
      userId: repo.userId,
      action: "analysis_started",
      metadata: { repositoryId: id, url: repo.url },
    });

    return NextResponse.json({
      success: true,
      analysisId: analysis?.id,
      message: "Analysis queued",
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
