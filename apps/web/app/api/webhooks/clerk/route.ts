import { NextResponse } from "next/server";
import { userService } from "@/lib/services/database";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { type, data } = payload;

    switch (type) {
      case "user.created":
      case "user.updated": {
        await userService.upsert({
          clerkId: data.id,
          email: data.email_addresses?.[0]?.email_address ?? "",
          name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || undefined,
          avatarUrl: data.image_url,
        });
        break;
      }
      case "user.deleted": {
        // User deletion is handled by Clerk - data is synced automatically
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
