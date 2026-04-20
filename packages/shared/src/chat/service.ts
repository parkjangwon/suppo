import { randomBytes } from "node:crypto";

import { prisma } from "@suppo/db";
import { pickAssignee, type CandidateAgent } from "@suppo/shared/assignment/pick-assignee";
import { buildChatCustomerTokenHash } from "@suppo/shared/chat/token";
import { dispatchEmailOutboxSoon } from "@suppo/shared/email/dispatch-trigger";
import { enqueueTicketCreatedEmails } from "@suppo/shared/email/enqueue";
import { generateTicketNumber } from "@suppo/shared/tickets/ticket-number";

export { buildChatCustomerTokenHash } from "@suppo/shared/chat/token";

type TicketPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
type CommentAuthorType = "CUSTOMER" | "AGENT";

interface CandidateAgentRow {
  id: string;
  name: string;
  maxTickets: number;
  createdAt: Date;
  lastAssignedAt: Date | null;
  _count: {
    assignedTickets: number;
  };
}

interface ChatDb {
  $transaction: <T>(callback: (tx: any) => Promise<T>) => Promise<T>;
}

interface StartChatConversationInput {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  initialMessage: string;
  requestTypeId?: string;
  priority?: TicketPriority;
  widgetKey?: string;
  metadata?: Record<string, unknown>;
}

interface PostChatMessageInput {
  conversationId: string;
  sender: {
    type: CommentAuthorType;
    id?: string;
    name: string;
    email: string;
  };
  content: string;
  timestamp?: Date;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
}

const ACTIVE_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING"] as const;

function issueChatCustomerToken() {
  return `chat_${randomBytes(16).toString("hex")}`;
}

async function resolveChatRequestType(tx: any, requestTypeId?: string) {
  if (requestTypeId) {
    const existing = await tx.requestType.findFirst({
      where: { id: requestTypeId },
    });

    if (!existing) {
      throw new Error("Invalid request type");
    }

    return existing;
  }

  const inAppType = await tx.requestType.findFirst({
    where: {
      channel: "IN_APP",
      isActive: true,
    },
  });

  if (inAppType) {
    return inAppType;
  }

  return tx.requestType.create({
    data: {
      name: "실시간 채팅",
      description: "웹 채팅/SDK에서 생성된 실시간 상담",
      channel: "IN_APP",
      defaultPriority: "MEDIUM",
      isActive: true,
      sortOrder: 999,
    },
  });
}

async function buildCandidates(tx: any, categoryId: string | null): Promise<CandidateAgent[]> {
  const now = new Date();

  const agents: CandidateAgentRow[] = await tx.agent.findMany({
    where: {
      isActive: true,
      role: { in: ["AGENT", "TEAM_LEAD"] },
      ...(categoryId
        ? {
            categories: {
              some: { categoryId },
            },
          }
        : {}),
      absences: {
        none: {
          startDate: { lte: now },
          endDate: { gte: now },
        },
      },
    },
    select: {
      id: true,
      name: true,
      maxTickets: true,
      createdAt: true,
      lastAssignedAt: true,
      _count: {
        select: {
          assignedTickets: {
            where: {
              status: {
                in: ACTIVE_STATUSES,
              },
            },
          },
        },
      },
    },
  });

  return agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    maxTickets: agent.maxTickets,
    currentTickets: agent._count.assignedTickets,
    loadRatio: agent.maxTickets > 0 ? agent._count.assignedTickets / agent.maxTickets : 1,
    lastAssignedAt: agent.lastAssignedAt ?? agent.createdAt,
  }));
}

export async function createChatConversation(input: StartChatConversationInput, db: ChatDb = prisma as never) {
  const customerToken = issueChatCustomerToken();
  const customerTokenHash = buildChatCustomerTokenHash(customerToken);

  const result = await db.$transaction(async (tx) => {
    const widgetSettings = await tx.chatWidgetSettings.findUnique({
      where: { id: "default" },
    });

    const requestType = await resolveChatRequestType(tx, input.requestTypeId);
    const customer = await tx.customer.upsert({
      where: { email: input.customerEmail },
      update: {
        name: input.customerName,
        phone: input.customerPhone ?? null,
        ticketCount: { increment: 1 },
        lastTicketAt: new Date(),
      },
      create: {
        email: input.customerEmail,
        name: input.customerName,
        phone: input.customerPhone ?? null,
        ticketCount: 1,
        lastTicketAt: new Date(),
      },
    });

    const candidates = await buildCandidates(tx, requestType.categoryId ?? null);
    const assignee = pickAssignee(candidates);
    const ticket = await tx.ticket.create({
      data: {
        ticketNumber: await generateTicketNumber(),
        customerId: customer.id,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        subject: input.initialMessage.slice(0, 120),
        description: input.initialMessage,
        categoryId: requestType.categoryId ?? undefined,
        requestTypeId: requestType.id,
        priority: input.priority ?? requestType.defaultPriority ?? "MEDIUM",
        assigneeId: assignee?.id,
        source: "IN_APP",
      },
    });

    if (assignee) {
      await tx.agent.update({
        where: { id: assignee.id },
        data: { lastAssignedAt: new Date() },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          actorType: "AGENT",
          actorId: assignee.id,
          action: "ASSIGNED",
          newValue: assignee.id,
        },
      });
    }

    const conversation = await tx.chatConversation.create({
      data: {
        ticketId: ticket.id,
        widgetKey: input.widgetKey ?? widgetSettings?.widgetKey ?? "suppo-chat-widget",
        customerTokenHash,
        status: "WAITING_AGENT",
        lastMessageAt: new Date(),
        lastCustomerMessageAt: new Date(),
        metadata: input.metadata ?? null,
      },
    });

    const initialComment = await tx.comment.create({
      data: {
        ticketId: ticket.id,
        authorType: "CUSTOMER",
        authorName: input.customerName,
        authorEmail: input.customerEmail,
        content: input.initialMessage,
        isInternal: false,
      },
    });

    await tx.chatEvent.create({
      data: {
        conversationId: conversation.id,
        ticketId: ticket.id,
        type: "conversation.started",
        payload: {
          ticketNumber: ticket.ticketNumber,
          assigneeId: assignee?.id ?? null,
          commentId: initialComment.id,
        },
      },
    });

    return {
      conversationId: conversation.id,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      ticketSubject: ticket.subject,
      customerName: ticket.customerName,
      customerEmail: ticket.customerEmail,
      customerToken,
      assigneeId: assignee?.id ?? null,
    };
  });

  await enqueueTicketCreatedEmails({
    ticketId: result.ticketId,
    ticketNumber: result.ticketNumber,
    ticketSubject: result.ticketSubject,
    customerName: result.customerName,
    customerEmail: result.customerEmail,
  });
  dispatchEmailOutboxSoon();

  return result;
}

export async function postChatMessage(input: PostChatMessageInput, db: ChatDb = prisma as never) {
  const timestamp = input.timestamp ?? new Date();

  return db.$transaction(async (tx) => {
    const conversation = await tx.chatConversation.findUnique({
      where: { id: input.conversationId },
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const comment = await tx.comment.create({
      data: {
        ticketId: conversation.ticketId,
        authorType: input.sender.type,
        authorId: input.sender.id,
        authorName: input.sender.name,
        authorEmail: input.sender.email,
        content: input.content,
        isInternal: false,
        attachments: input.attachments?.length
          ? {
              create: input.attachments.map((attachment) => ({
                ticketId: conversation.ticketId,
                fileName: attachment.fileName,
                fileUrl: attachment.fileUrl,
                fileSize: attachment.fileSize,
                mimeType: attachment.mimeType,
                uploadedBy: input.sender.name,
              })),
            }
          : undefined,
      },
      include: {
        attachments: true,
      },
    });

    const nextStatus = input.sender.type === "AGENT" ? "WAITING_CUSTOMER" : "WAITING_AGENT";
    const nextTicketStatus = input.sender.type === "AGENT" ? "IN_PROGRESS" : "OPEN";

    await tx.chatConversation.update({
      where: { id: input.conversationId },
      data: {
        status: nextStatus,
        lastMessageAt: timestamp,
        ...(input.sender.type === "AGENT"
          ? { lastAgentMessageAt: timestamp }
          : { lastCustomerMessageAt: timestamp }),
      },
    });

    await tx.ticket.update({
      where: { id: conversation.ticketId },
      data: {
        status: nextTicketStatus,
      },
    });

    await tx.chatEvent.create({
      data: {
        conversationId: input.conversationId,
        ticketId: conversation.ticketId,
        type: "message.created",
        payload: {
          commentId: comment.id,
          senderType: input.sender.type,
        },
      },
    });

    return {
      commentId: comment.id,
      ticketId: conversation.ticketId,
      conversationId: input.conversationId,
    };
  });
}

export async function getChatConversationForCustomer(conversationId: string) {
  return prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: {
      ticket: {
        include: {
          assignee: {
            select: { id: true, name: true },
          },
          comments: {
            where: {
              isInternal: false,
            },
            orderBy: { createdAt: "asc" },
            include: {
              attachments: true,
            },
          },
          attachments: true,
        },
      },
    },
  });
}
