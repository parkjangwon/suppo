import { NextResponse } from "next/server";

import { createChatConversation } from "@crinity/shared/chat/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createChatConversation({
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      initialMessage: body.initialMessage,
      widgetKey: body.widgetKey,
      metadata: body.metadata,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create chat conversation:", error);
    return NextResponse.json({ error: "Failed to create chat conversation" }, { status: 500 });
  }
}
