import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@crinity/db";

import { auth } from "@/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { isTyping?: boolean };
    const isTyping = Boolean(body.isTyping);

    const conversation = await prisma.chatConversation.findUnique({
      where: { id },
      select: { ticketId: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    await prisma.chatEvent.create({
      data: {
        conversationId: id,
        ticketId: conversation.ticketId,
        type: "typing.updated",
        payload: {
          senderType: "AGENT",
          isTyping,
          agentId: session.user.agentId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update agent typing state:", error);
    return NextResponse.json({ error: "Failed to update agent typing state" }, { status: 500 });
  }
}
