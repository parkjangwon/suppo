import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@suppo/db";
import { verifyTicketAccessToken } from "@suppo/shared/security/ticket-access";
import { serveAttachmentFile } from "@suppo/shared/storage/upload-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ticket_access")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await verifyTicketAccessToken(token);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: {
      ticket: {
        select: {
          ticketNumber: true,
          customerEmail: true,
        },
      },
      comment: {
        select: {
          isInternal: true,
        },
      },
    },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (attachment.comment?.isInternal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (attachment.ticket.ticketNumber !== access.ticketNumber || attachment.ticket.customerEmail !== access.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return serveAttachmentFile(attachment.fileUrl, attachment.fileName);
}
