import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { userService, statsService, activityService, notificationService } from "@/lib/services/database";

/** Ensure the user exists in our database (fallback if Clerk webhook hasn't synced) */
async function ensureUser(clerkId: string) {
  let userData = await userService.findByClerkId(clerkId);
  if (userData) return userData;

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

    const userData = await ensureUser(clerkId);

    const [stats, recentActivity, unreadCount] = await Promise.all([
      statsService.getDashboardStats(userData.id),
      activityService.list(20),
      notificationService.unreadCount(userData.id),
    ]);

    return NextResponse.json({
      stats,
      recentActivity,
      unreadCount,
    });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
