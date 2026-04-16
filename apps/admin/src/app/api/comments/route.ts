import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { addComment, getAdminTicketDetail, updateTicketStatus } from "@/lib/db/queries/admin-tickets";
import {
  enqueueInternalCommentNotifications,
  enqueueNewCommentEmail,
} from "@crinity/shared/email/enqueue";
import { processAttachments, AttachmentError } from "@crinity/shared/storage/attachment-service";
import { dispatchWebhookEvent } from "@crinity/shared/integrations/outbound-webhooks";
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
    let processedAttachments: Awaited<ReturnType<typeof processAttachments>> = [];
    const authorName = session.user.name ?? session.user.email ?? "Unknown Agent";
    const authorEmail = session.user.email ?? "";

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
      authorName,
      authorEmail,
      attachments: processedAttachments,
    });

    const emailSettings = await prisma.emailSettings.findUnique({
      where: { id: "default" },
      select: { notificationEmail: true },
    });

    if (!isInternal) {
      await enqueueNewCommentEmail(
        ticket.customerEmail,
        ticket.ticketNumber,
        authorName,
        true,
        prisma,
        { ticketId }
      );
    }

    if (!isInternal && ticket.assigneeId && ticket.status !== "IN_PROGRESS") {
      await updateTicketStatus(ticketId, "IN_PROGRESS", session.user.agentId);
    }

    if (!isInternal) {
      await enqueueInternalCommentNotifications(
        [ticket.assignee?.email ?? null, emailSettings?.notificationEmail ?? null],
        ticket.ticketNumber,
        authorName
      );
    }

    const chatConversation = await prisma.chatConversation.findUnique({
      where: { ticketId },
      select: { id: true },
    });

    if (chatConversation && !isInternal) {
      await prisma.chatConversation.update({
        where: { id: chatConversation.id },
        data: {
          status: "WAITING_CUSTOMER",
          lastMessageAt: new Date(),
          lastAgentMessageAt: new Date(),
        },
      });

      await prisma.chatEvent.create({
        data: {
          conversationId: chatConversation.id,
          ticketId,
          type: "message.created",
          payload: {
            commentId: comment.id,
            senderType: "AGENT",
          },
        },
      });
    }

    await dispatchWebhookEvent("ticket.commented", {
      source: "admin-panel",
      ticketId,
      ticketNumber: ticket.ticketNumber,
      commentId: comment.id,
      isInternal: comment.isInternal,
      authorId: session.user.agentId,
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to add comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
