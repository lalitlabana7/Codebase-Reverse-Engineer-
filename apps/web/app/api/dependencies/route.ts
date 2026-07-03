import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { userService, dependencyService } from "@/lib/services/database";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await userService.findByClerkId(clerkId);
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const repositoryId = searchParams.get("repositoryId");

    let dependencies;
    let summary;

    if (repositoryId) {
      dependencies = await dependencyService.listByRepository(repositoryId);
      summary = await dependencyService.getSummary(repositoryId);
    } else {
      dependencies = await dependencyService.listAll(userData.id);
      summary = await dependencyService.listAllSummary(userData.id);
    }

    return NextResponse.json({ dependencies, summary });
  } catch (error: any) {
    console.error("Error fetching dependencies:", error);
    return NextResponse.json({ error: "Failed to fetch dependencies" }, { status: 500 });
  }
}
