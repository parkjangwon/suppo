import { NextResponse } from "next/server";

import { getChatConversationForCustomer } from "@crinity/shared/chat/service";
import { verifyChatCustomerAccess } from "@crinity/shared/chat/customer-token";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await verifyChatCustomerAccess(id, token);
    if (!access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversation = await getChatConversationForCustomer(id);
    if (!conversation) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Failed to load chat conversation:", error);
    return NextResponse.json({ error: "Failed to load chat conversation" }, { status: 500 });
  }
}
