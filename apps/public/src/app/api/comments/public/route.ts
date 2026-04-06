import { NextResponse } from "next/server";
import { prisma } from "@crinity/db";
import { verifyTicketAccessToken } from "@crinity/shared/security/ticket-access";
import { cookies } from "next/headers";
import { processAttachments, AttachmentError } from "@crinity/shared/storage/attachment-service";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ticket_access")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await verifyTicketAccessToken(token);
    if (!access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const ticketId = formData.get("ticketId") as string;
    const content = formData.get("content") as string;

    if (!ticketId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { ticketNumber: true, customerEmail: true, customerName: true },
    });

    if (!ticket || ticket.ticketNumber !== access.ticketNumber || ticket.customerEmail !== access.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const files = formData.getAll("attachments") as File[];
    let processedAttachments: Awaited<ReturnType<typeof processAttachments>> = [];

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

    const comment = await prisma.comment.create({
      data: {
        content,
        ticketId,
        isInternal: false,
        authorType: "CUSTOMER",
        authorName: ticket.customerName,
        authorEmail: ticket.customerEmail,
        attachments: processedAttachments.length > 0
          ? {
              create: processedAttachments.map(att => ({
                ticketId,
                fileName: att.fileName,
                fileSize: att.fileSize,
                mimeType: att.mimeType,
                fileUrl: att.fileUrl,
                uploadedBy: ticket.customerName,
              })),
            }
          : undefined,
      },
      include: {
        attachments: true,
      },
    });

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error("Public comment creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
