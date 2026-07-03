import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { complianceEngine } from "@/lib/services/compliance-engine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const repositoryId = searchParams.get("repositoryId");
    const standard = searchParams.get("standard") as any;

    if (!repositoryId || !standard) {
      return NextResponse.json({ error: "repositoryId and standard required" }, { status: 400 });
    }

    const result = await complianceEngine.getLatestReport(repositoryId, standard);
    return NextResponse.json({ report: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { repositoryId, standard } = body;

    if (!repositoryId || !standard) {
      return NextResponse.json({ error: "repositoryId and standard required" }, { status: 400 });
    }

    const result = await complianceEngine.runAssessment({ repositoryId, standard });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
