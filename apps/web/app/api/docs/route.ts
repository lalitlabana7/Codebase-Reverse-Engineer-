import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { docsGenerator } from "@/lib/services/docs-generator";
import { db } from "@codebuff/database";
import { documents } from "@codebuff/database";
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

    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.repositoryId, repositoryId))
      .orderBy(desc(documents.generatedAt));

    return NextResponse.json({ documents: docs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { repositoryId, type } = body;

    if (!repositoryId || !type) {
      return NextResponse.json({ error: "repositoryId and type required" }, { status: 400 });
    }

    const result = await docsGenerator.generate({ repositoryId, type });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await db.delete(documents).where(eq(documents.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
