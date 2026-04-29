import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { serveAttachmentFile } from "@suppo/shared/storage/upload-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: {
      ticket: {
        select: {
          assigneeId: true,
        },
      },
    },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (session.user.role === "AGENT" && attachment.ticket.assigneeId !== session.user.agentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return serveAttachmentFile(attachment.fileUrl, attachment.fileName);
}
