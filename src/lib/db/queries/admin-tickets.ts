import { prisma } from "../client";
import { TicketStatus, TicketPriority, Prisma } from "@prisma/client";

export interface GetAdminTicketsParams {
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: string;
  assigneeId?: string;
  search?: string;
  cursor?: string;
  limit?: number;
  agentId?: string;
  agentRole?: "ADMIN" | "AGENT";
}

export async function getAdminTickets(params: GetAdminTicketsParams) {
  const {
    status,
    priority,
    categoryId,
    assigneeId,
    search,
    cursor,
    limit = 20,
    agentId,
    agentRole,
  } = params;

  const where: Prisma.TicketWhereInput = {};

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (categoryId) where.categoryId = categoryId;
  
  if (agentRole === "AGENT") {
    where.assigneeId = agentId;
  } else if (assigneeId) {
    if (assigneeId === "unassigned") {
      where.assigneeId = null;
    } else {
      where.assigneeId = assigneeId;
    }
  }

  if (search) {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
      { customerEmail: { contains: search, mode: "insensitive" } },
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      assignee: true,
    },
  });

  let nextCursor: string | null = null;
  if (tickets.length > limit) {
    const nextItem = tickets.pop();
    nextCursor = nextItem!.id;
  }

  return {
    tickets,
    nextCursor,
  };
}

export async function getAdminTicketDetail(id: string, agentId: string, agentRole: "ADMIN" | "AGENT") {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      assignee: true,
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          attachments: true,
          author: true,
        },
      },
      attachments: true,
      activities: {
        orderBy: { createdAt: "desc" },
        include: {
          actor: true,
        },
      },
    },
  });

  if (!ticket) return null;

  if (agentRole === "AGENT" && ticket.assigneeId !== agentId) {
    throw new Error("Unauthorized");
  }

  return ticket;
}

export async function updateTicketStatus(id: string, status: TicketStatus, actorId: string) {
  const oldTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!oldTicket) throw new Error("Ticket not found");

  const ticket = await prisma.ticket.update({
    where: { id },
    data: { status },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: id,
      actorType: "AGENT",
      actorId,
      action: "STATUS_CHANGED",
      oldValue: oldTicket.status,
      newValue: status,
    },
  });

  return ticket;
}

export async function updateTicketPriority(id: string, priority: TicketPriority, actorId: string) {
  const oldTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!oldTicket) throw new Error("Ticket not found");

  const ticket = await prisma.ticket.update({
    where: { id },
    data: { priority },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: id,
      actorType: "AGENT",
      actorId,
      action: "PRIORITY_CHANGED",
      oldValue: oldTicket.priority,
      newValue: priority,
    },
  });

  return ticket;
}

export async function assignTicket(id: string, assigneeId: string | null, actorId: string) {
  const oldTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!oldTicket) throw new Error("Ticket not found");

  const ticket = await prisma.ticket.update({
    where: { id },
    data: { assigneeId },
  });

  if (oldTicket.assigneeId && assigneeId && oldTicket.assigneeId !== assigneeId) {
    await prisma.ticketTransfer.create({
      data: {
        ticketId: id,
        fromAgentId: oldTicket.assigneeId,
        toAgentId: assigneeId,
      },
    });
    
    await prisma.ticketActivity.create({
      data: {
        ticketId: id,
        actorType: "AGENT",
        actorId,
        action: "TRANSFERRED",
        oldValue: oldTicket.assigneeId,
        newValue: assigneeId,
      },
    });
  } else {
    await prisma.ticketActivity.create({
      data: {
        ticketId: id,
        actorType: "AGENT",
        actorId,
        action: "ASSIGNED",
        oldValue: oldTicket.assigneeId || "unassigned",
        newValue: assigneeId || "unassigned",
      },
    });
  }

  return ticket;
}

export async function addComment(data: {
  ticketId: string;
  content: string;
  isInternal: boolean;
  authorId: string;
  authorName: string;
  authorEmail: string;
  attachments?: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileUrl: string;
  }[];
}) {
  return prisma.comment.create({
    data: {
      ticketId: data.ticketId,
      content: data.content,
      isInternal: data.isInternal,
      authorType: "AGENT",
      authorId: data.authorId,
      authorName: data.authorName,
      authorEmail: data.authorEmail,
      attachments: data.attachments && data.attachments.length > 0
        ? {
            create: data.attachments.map(att => ({
              ticketId: data.ticketId,
              fileName: att.fileName,
              fileSize: att.fileSize,
              mimeType: att.mimeType,
              fileUrl: att.fileUrl,
              uploadedBy: data.authorName,
            })),
          }
        : undefined,
    },
    include: {
      author: true,
      attachments: true,
    },
  });
}
