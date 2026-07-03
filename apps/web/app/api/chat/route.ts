import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { userService, chatService } from "@/lib/services/database";
import { ragService } from "@/lib/services/ai";

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

    if (!repositoryId) {
      return NextResponse.json({ error: "repositoryId required" }, { status: 400 });
    }

    const sessions = await chatService.listSessions(repositoryId, userData.id);
    return NextResponse.json({ sessions });
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

    const userData = await userService.findByClerkId(clerkId);
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { repositoryId, message, sessionId } = body;

    if (!repositoryId || !message) {
      return NextResponse.json(
        { error: "repositoryId and message required" },
        { status: 400 }
      );
    }

    // Create or get session
    let session;
    if (sessionId) {
      session = { id: sessionId };
    } else {
      const [newSession] = await chatService.createSession(
        repositoryId,
        userData.id,
        `Chat about ${message.slice(0, 50)}...`
      );
      session = newSession;
    }

    if (!session) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    // Save user message
    await chatService.addMessage({
      sessionId: session.id,
      role: "user",
      content: message,
    });

    // Check if client wants streaming
    const acceptHeader = req.headers.get("accept") ?? "";
    const wantsStream = body.stream === true || acceptHeader.includes("text/event-stream");

    if (wantsStream) {
      // SSE streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let fullContent = "";
          let sources: string[] = [];

          try {
            const result = await ragService.answerQuestion({
              repositoryId,
              question: message,
              onStream: (chunk: string) => {
                fullContent += chunk;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`));
              },
            });

            sources = result.sources;

            // Save AI message
            const savedMessages = await chatService.addMessage({
              sessionId: session.id,
              role: "assistant",
              content: fullContent,
              sources: { files: sources },
              tokensUsed: result.tokensUsed,
            });
            const savedMessage = savedMessages?.[0];

            // Send done event with metadata
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: "done",
              messageId: savedMessage?.id ?? `ai-${Date.now()}`,
              sessionId: session.id,
              sources,
              tokensUsed: result.tokensUsed,
            })}\n\n`));
          } catch (err: any) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: "error",
              error: err.message,
            })}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming fallback
    const result = await ragService.answerQuestion({
      repositoryId,
      question: message,
    });

    const [aiMessage] = await chatService.addMessage({
      sessionId: session.id,
      role: "assistant",
      content: result.content,
      sources: { files: result.sources },
      tokensUsed: result.tokensUsed,
    });

    return NextResponse.json({
      sessionId: session.id,
      message: aiMessage,
      sources: result.sources,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    await chatService.deleteSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
