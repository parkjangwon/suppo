import { NextResponse } from "next/server";

import { prisma } from "@crinity/db";
import { verifyChatCustomerAccess } from "@crinity/shared/chat/customer-token";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { token?: string; isTyping?: boolean };
    const token = body.token as string | undefined;
    const isTyping = Boolean(body.isTyping);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await verifyChatCustomerAccess(id, token);
    if (!access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.chatEvent.create({
      data: {
        conversationId: id,
        ticketId: access.ticketId,
        type: "typing.updated",
        payload: {
          senderType: "CUSTOMER",
          isTyping,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update customer typing state:", error);
    return NextResponse.json({ error: "Failed to update customer typing state" }, { status: 500 });
  }
}
