import { NextResponse } from "next/server";

import { prisma } from "@crinity/db";
import { verifyChatCustomerAccess } from "@crinity/shared/chat/customer-token";
import { postChatMessage } from "@crinity/shared/chat/service";
import { processAttachments, AttachmentError } from "@crinity/shared/storage/attachment-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const token = formData.get("token") as string | null;
    const content = formData.get("content") as string | null;

    if (!token || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const access = await verifyChatCustomerAccess(id, token);
    if (!access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: access.ticketId },
      select: {
        customerName: true,
        customerEmail: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Conversation ticket not found" }, { status: 404 });
    }

    const files = formData.getAll("attachments") as File[];
    let processedAttachments: Array<{
      fileName: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
    }> = [];

    if (files.length > 0) {
      try {
        processedAttachments = await processAttachments(files, access.ticketId);
      } catch (error) {
        if (error instanceof AttachmentError) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        throw error;
      }
    }

    const result = await postChatMessage({
      conversationId: id,
      sender: {
        type: "CUSTOMER",
        name: ticket.customerName,
        email: ticket.customerEmail,
      },
      content,
      attachments: processedAttachments,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to post customer chat message:", error);
    return NextResponse.json({ error: "Failed to post customer chat message" }, { status: 500 });
  }
}
