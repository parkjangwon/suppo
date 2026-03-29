import { NextResponse } from "next/server";

import { prisma } from "@crinity/db";
import { verifyChatCustomerAccess } from "@crinity/shared/chat/customer-token";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const token = body.token as string | undefined;
    const commentId = body.commentId as string | undefined;

    if (!token || !commentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const access = await verifyChatCustomerAccess(id, token);
    if (!access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.chatEvent.create({
      data: {
        conversationId: id,
        ticketId: access.ticketId,
        type: "message.read",
        payload: {
          senderType: "CUSTOMER",
          commentId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to record customer read state:", error);
    return NextResponse.json({ error: "Failed to record customer read state" }, { status: 500 });
  }
}
