import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ticketId, content, isInternal } = body;

  if (!ticketId || !content) {
    return Response.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Check permissions
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { assigneeId: true, customerEmail: true },
  });

  if (!ticket) {
    return Response.json({ error: "Ticket not found" }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isAssignee = ticket.assigneeId === session.user.agentId;

  if (!isAdmin && !isAssignee) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const comment = await prisma.comment.create({
    data: {
      ticketId,
      authorType: "AGENT",
      authorId: session.user.agentId,
      authorName: session.user.name,
      authorEmail: session.user.email,
      content,
      isInternal: isInternal || false,
    },
  });

  if (!isInternal && ticket.assigneeId) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "IN_PROGRESS" },
    });
  }

  return Response.json(comment);
}
