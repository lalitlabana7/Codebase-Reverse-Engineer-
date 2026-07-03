import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { securityService } from "@/lib/services/database";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const repositoryId = searchParams.get("repositoryId");

    if (!repositoryId) {
      return NextResponse.json({ error: "repositoryId required" }, { status: 400 });
    }

    const [findings, score, secrets] = await Promise.all([
      securityService.listFindings(repositoryId),
      securityService.getScore(repositoryId),
      securityService.listSecrets(repositoryId),
    ]);

    return NextResponse.json({
      findings,
      score,
      secrets,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
