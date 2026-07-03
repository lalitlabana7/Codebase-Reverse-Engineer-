import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { userService, chatService } from "@/lib/services/database";

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
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const messages = await chatService.getMessages(sessionId);
    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
