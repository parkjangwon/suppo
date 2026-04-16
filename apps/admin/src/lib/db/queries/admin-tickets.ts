import { prisma } from "@crinity/db";
import { TicketStatus, TicketPriority, Prisma } from "@prisma/client";
import {
  enqueueCSATSurveyEmail,
  enqueueInternalStatusNotifications,
  enqueueStatusChangedEmail,
  enqueueTicketAssignedEmail,
} from "@crinity/shared/email/enqueue";

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

  const where: Prisma.TicketWhereInput = {
    chatConversation: null,
  };

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
      { ticketNumber: { contains: search } },
      { subject: { contains: search } },
      { customerEmail: { contains: search } },
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

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
  actorId: string | null,
  actorType: "AGENT" | "SYSTEM" = "AGENT"
) {
  const oldTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!oldTicket) throw new Error("Ticket not found");

  const updateData: any = { status };

  // RESOLVED일 경우 해결일 설정
  if (status === "RESOLVED" && !oldTicket.resolvedAt) {
    updateData.resolvedAt = new Date();
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data: updateData,
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: id,
      actorType,
      actorId: actorId ?? undefined,
      action: "STATUS_CHANGED",
      oldValue: oldTicket.status,
      newValue: status,
    },
  });

  const emailSettings = await prisma.emailSettings.findUnique({
    where: { id: "default" },
    select: { notificationEmail: true },
  });

  // RESOLVED 상태로 변경 시 CSAT 설문 이메일 발송 (이전 상태가 RESOLVED가 아닌 경우)
  if (status === "RESOLVED" && oldTicket.status !== "RESOLVED") {
    await enqueueCSATSurveyEmail(
      id,
      ticket.ticketNumber,
      ticket.subject,
      ticket.customerEmail,
      ticket.customerName
    );
  }

  if (oldTicket.status !== status) {
    await enqueueStatusChangedEmail(
      ticket.customerEmail,
      ticket.ticketNumber,
      oldTicket.status,
      status,
      prisma,
      {
        recipientCategory: "CUSTOMER",
        ticketId: ticket.id,
      }
    );

    const assigneeEmail = ticket.assigneeId
      ? (await prisma.agent.findUnique({
          where: { id: ticket.assigneeId },
          select: { email: true },
        }))?.email
      : null;

    await enqueueInternalStatusNotifications(
      [assigneeEmail, emailSettings?.notificationEmail ?? null],
      ticket.ticketNumber,
      oldTicket.status,
      status
    );
  }

  return ticket;
}

export async function updateTicketPriority(
  id: string,
  priority: TicketPriority,
  actorId: string | null,
  actorType: "AGENT" | "SYSTEM" = "AGENT"
) {
  const oldTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!oldTicket) throw new Error("Ticket not found");

  const ticket = await prisma.ticket.update({
    where: { id },
    data: { priority },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: id,
      actorType,
      actorId: actorId ?? undefined,
      action: "PRIORITY_CHANGED",
      oldValue: oldTicket.priority,
      newValue: priority,
    },
  });

  return ticket;
}

export async function assignTicket(
  id: string,
  assigneeId: string | null,
  actorId: string | null,
  actorType: "AGENT" | "SYSTEM" = "AGENT"
) {
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
        actorType,
        actorId: actorId ?? undefined,
        action: "TRANSFERRED",
        oldValue: oldTicket.assigneeId,
        newValue: assigneeId,
      },
    });
  } else {
    await prisma.ticketActivity.create({
      data: {
        ticketId: id,
        actorType,
        actorId: actorId ?? undefined,
        action: "ASSIGNED",
        oldValue: oldTicket.assigneeId || "unassigned",
        newValue: assigneeId || "unassigned",
      },
    });
  }

  if (assigneeId && assigneeId !== oldTicket.assigneeId) {
    const assignee = await prisma.agent.findUnique({
      where: { id: assigneeId },
      select: { email: true, name: true },
    });

    if (assignee?.email) {
      await enqueueTicketAssignedEmail(
        assignee.email,
        {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          ticketSubject: ticket.subject,
          customerName: ticket.customerName,
          customerEmail: ticket.customerEmail,
        },
        assignee.name
      );
    }
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
