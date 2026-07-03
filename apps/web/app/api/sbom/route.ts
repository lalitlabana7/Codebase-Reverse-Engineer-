import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sbomGenerator } from "@/lib/services/sbom-generator";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const repositoryId = searchParams.get("repositoryId");

    if (!repositoryId) {
      return NextResponse.json({ error: "repositoryId required" }, { status: 400 });
    }

    const result = await sbomGenerator.getLatest(repositoryId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { repositoryId } = body;

    if (!repositoryId) {
      return NextResponse.json({ error: "repositoryId required" }, { status: 400 });
    }

    const result = await sbomGenerator.generate(repositoryId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
