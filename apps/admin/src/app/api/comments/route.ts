import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { addComment, getAdminTicketDetail, updateTicketStatus } from "@/lib/db/queries/admin-tickets";
import { processAttachments, AttachmentError } from "@crinity/shared/storage/attachment-service";
import { prisma } from "@crinity/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const ticketId = formData.get("ticketId") as string;
    const content = formData.get("content") as string;
    const isInternal = formData.get("isInternal") === "true";

    if (!ticketId || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const ticket = await getAdminTicketDetail(ticketId, session.user.agentId, session.user.role as "ADMIN" | "AGENT");

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const files = formData.getAll("attachments") as File[];
    let processedAttachments = [];

    if (files.length > 0) {
      try {
        processedAttachments = await processAttachments(files, ticketId);
      } catch (error) {
        if (error instanceof AttachmentError) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        throw error;
      }
    }

    const comment = await addComment({
      ticketId,
      content,
      isInternal: isInternal || false,
      authorId: session.user.agentId,
      authorName: session.user.name,
      authorEmail: session.user.email,
      attachments: processedAttachments,
    });

    if (!isInternal && ticket.assigneeId && ticket.status !== "IN_PROGRESS") {
      await updateTicketStatus(ticketId, "IN_PROGRESS", session.user.agentId);
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to add comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
