import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { diagramGenerator } from "@/lib/services/diagram-generator";
import { db } from "@codebuff/database";
import { diagrams } from "@codebuff/database";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const repositoryId = searchParams.get("repositoryId");

    if (!repositoryId) {
      return NextResponse.json({ error: "repositoryId required" }, { status: 400 });
    }

    const result = await db
      .select()
      .from(diagrams)
      .where(eq(diagrams.repositoryId, repositoryId))
      .orderBy(desc(diagrams.createdAt));

    return NextResponse.json({ diagrams: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { repositoryId, type, title } = body;

    if (!repositoryId || !type) {
      return NextResponse.json({ error: "repositoryId and type required" }, { status: 400 });
    }

    const result = await diagramGenerator.generate({ repositoryId, type, title });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
