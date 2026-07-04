import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { analysisService, userService } from "@/lib/services/database";

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

    let analyses;
    if (repositoryId) {
      analyses = await analysisService.list(repositoryId);
    } else {
      analyses = await analysisService.listAll(userData.id);
    }

    return NextResponse.json({ analyses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { repositoryId, type } = body;

    if (!repositoryId) {
      return NextResponse.json({ error: "repositoryId required" }, { status: 400 });
    }

    // Create analysis record
    const [analysis] = await analysisService.create({
      repositoryId,
      type: type || "full",
    });

    if (!analysis) {
      return NextResponse.json({ error: "Failed to create analysis" }, { status: 500 });
    }

    return NextResponse.json({
      analysis,
      status: "created",
      message: "Analysis record created. Trigger re-analysis from the repository page.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
