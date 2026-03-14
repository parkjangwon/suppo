import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      assignee: true,
      comments: {
        include: { attachments: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(ticket);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    select: { assigneeId: true },
  });

  if (!ticket) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isAssignee = ticket.assigneeId === session.user.agentId;

  if (!isAdmin && !isAssignee) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { status, priority, assigneeId } = body;

  const updates: any = {};
  if (status) updates.status = status;
  if (priority) updates.priority = priority;
  if (assigneeId !== undefined) updates.assigneeId = assigneeId;

  const updated = await prisma.ticket.update({
    where: { id: params.id },
    data: updates,
  });

  if (status) {
    await prisma.ticketActivity.create({
      data: {
        ticketId: params.id,
        actorType: "AGENT",
        actorId: session.user.agentId,
        action: "STATUS_CHANGED",
        oldValue: ticket.status,
        newValue: status,
      },
    });
  }

  return Response.json(updated);
}
