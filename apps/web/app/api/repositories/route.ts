import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { userService, repositoryService, analysisService, activityService } from "@/lib/services/database";

/** Ensure the user exists in our database (fallback if Clerk webhook hasn't synced) */
async function ensureUser(clerkId: string) {
  let userData = await userService.findByClerkId(clerkId);
  if (userData) return userData;

  // Try to fetch user details from Clerk API
  try {
    const clerkUser = await (await clerkClient()).users.getUser(clerkId);
    const [created] = await userService.upsert({
      clerkId,
      email: clerkUser.emailAddresses?.[0]?.emailAddress ?? `${clerkId}@clerk.dev`,
      name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || undefined,
      avatarUrl: clerkUser.imageUrl,
    });
    if (created) userData = created;
  } catch {
    // Last resort: create a minimal user record
    const { db, users } = await import("@codebuff/database");
    const [created] = await db.insert(users).values({
      clerkId,
      email: `${clerkId}@clerk.dev`,
    }).returning();
    if (created) userData = created;
  }

  if (!userData) throw new Error("Failed to create user account");
  return userData;
}

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await userService.findByClerkId(clerkId);
    if (!userData) {
      return NextResponse.json({ repositories: [] });
    }

    const repos = await repositoryService.list(userData.id);
    return NextResponse.json({ repositories: repos });
  } catch (error: any) {
    console.error("Error listing repositories:", error);
    return NextResponse.json(
      { error: "Failed to list repositories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-create user if webhook hasn't synced yet
    const userData = await ensureUser(clerkId);

    const body = await req.json();
    const { url, name, branch, githubToken } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate that it's a GitHub URL (required for API-based analysis)
    if (!url.includes("github.com")) {
      return NextResponse.json({
        error: "Only GitHub repositories are supported currently. Please provide a GitHub URL.",
      }, { status: 400 });
    }

    // Create repository in database
    const [repo] = await repositoryService.create({
      userId: userData.id,
      name: name || url.split("/").pop()?.replace(".git", "") || "unknown",
      url,
      cloneStatus: "cloning",
    });

    if (!repo) {
      return NextResponse.json({ error: "Failed to create repository" }, { status: 500 });
    }

    // Create analysis record
    const [analysis] = await analysisService.create({
      repositoryId: repo.id,
      type: "full",
    });

    // Log activity
    await activityService.create({
      userId: userData.id,
      action: "repository_added",
      metadata: { repositoryId: repo.id, url },
    });

    // Analysis runs on-demand when the user first opens the repository page.
    // The GET /api/repositories/[id] handler triggers it if the status is "queued".
    return NextResponse.json({
      repository: repo,
      analysisId: analysis?.id,
      status: "queued",
      message: "Repository connected. Open the repository page to start analysis.",
    });
  } catch (error: any) {
    console.error("Error creating repository:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create repository" },
      { status: 500 }
    );
  }
}
