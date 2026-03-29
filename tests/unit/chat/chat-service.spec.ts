import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRandomBytes, prismaMock } = vi.hoisted(() => ({
  mockRandomBytes: vi.fn(() => Buffer.from("1234567890abcdef1234567890abcdef")),
  prismaMock: {
    chatConversation: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("node:crypto", async () => {
  const actual = await vi.importActual<typeof import("node:crypto")>("node:crypto");
  return {
    ...actual,
    randomBytes: mockRandomBytes,
  };
});

vi.mock("@crinity/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@crinity/shared/tickets/ticket-number", () => ({
  generateTicketNumber: vi.fn().mockResolvedValue("CRN-CHAT-0001"),
}));

import {
  buildChatCustomerTokenHash,
  createChatConversation,
  getChatConversationForCustomer,
  postChatMessage,
} from "@/lib/chat/service";

describe("chat service", () => {
  beforeEach(() => {
    mockRandomBytes.mockClear();
    prismaMock.chatConversation.findUnique.mockReset();
  });

  it("creates a chat conversation backed by a ticket and first message", async () => {
    const tx = {
      requestType: {
        findFirst: vi.fn().mockResolvedValue({ id: "req-inapp", categoryId: null }),
        create: vi.fn(),
      },
      customer: {
        upsert: vi.fn().mockResolvedValue({ id: "customer-1" }),
      },
      agent: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "agent-1",
            name: "상담원 1",
            maxTickets: 10,
            createdAt: new Date("2026-03-28T00:00:00Z"),
            lastAssignedAt: new Date("2026-03-27T00:00:00Z"),
            _count: { assignedTickets: 1 },
          },
        ]),
        update: vi.fn().mockResolvedValue({}),
      },
      ticket: {
        create: vi.fn().mockResolvedValue({
          id: "ticket-1",
          ticketNumber: "CRN-CHAT-0001",
          customerId: "customer-1",
          customerName: "고객",
          customerEmail: "chat@example.com",
          customerPhone: null,
          subject: "첫 문의 메시지입니다.",
          description: "첫 문의 메시지입니다.",
          categoryId: null,
          priority: "MEDIUM",
          status: "OPEN",
          assigneeId: "agent-1",
          createdAt: new Date(),
          updatedAt: new Date(),
          resolvedAt: null,
          closedAt: null,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      ticketActivity: {
        create: vi.fn().mockResolvedValue({ id: "activity-1" }),
      },
      chatWidgetSettings: {
        findUnique: vi.fn().mockResolvedValue({ id: "default", widgetKey: "widget-public-key" }),
      },
      chatConversation: {
        create: vi.fn().mockResolvedValue({
          id: "conversation-1",
          ticketId: "ticket-1",
          customerTokenHash: "hashed-placeholder",
          status: "WAITING_AGENT",
          widgetKey: "widget-public-key",
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      comment: {
        create: vi.fn().mockResolvedValue({
          id: "comment-1",
          ticketId: "ticket-1",
          authorType: "CUSTOMER",
          content: "첫 문의 메시지입니다.",
        }),
      },
      chatEvent: {
        create: vi.fn().mockResolvedValue({ id: "event-1" }),
      },
    };

    const db = {
      $transaction: vi.fn().mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };

    const result = await createChatConversation(
      {
        customerName: "고객",
        customerEmail: "chat@example.com",
        initialMessage: "첫 문의 메시지입니다.",
      },
      db as never
    );

    expect(result.conversationId).toBe("conversation-1");
    expect(result.ticketId).toBe("ticket-1");
    expect(result.ticketNumber).toBe("CRN-CHAT-0001");
    expect(result.customerToken.startsWith("chat_")).toBe(true);
    expect(tx.ticket.create).toHaveBeenCalled();
    expect(tx.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticketId: "ticket-1",
          authorType: "CUSTOMER",
          content: "첫 문의 메시지입니다.",
        }),
      })
    );
    expect(tx.chatEvent.create).toHaveBeenCalled();
  });

  it("posts a new agent message and records a chat event", async () => {
    const now = new Date("2026-03-28T10:00:00Z");
    const tx = {
      chatConversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: "conversation-1",
          ticketId: "ticket-1",
          status: "WAITING_AGENT",
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      comment: {
        create: vi.fn().mockResolvedValue({
          id: "comment-2",
          ticketId: "ticket-1",
          authorType: "AGENT",
          content: "안녕하세요. 무엇을 도와드릴까요?",
        }),
      },
      ticket: {
        update: vi.fn().mockResolvedValue({}),
      },
      chatEvent: {
        create: vi.fn().mockResolvedValue({ id: "event-2" }),
      },
    };

    const db = {
      $transaction: vi.fn().mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };

    const result = await postChatMessage(
      {
        conversationId: "conversation-1",
        sender: {
          type: "AGENT",
          id: "agent-1",
          name: "상담원 1",
          email: "agent1@example.com",
        },
        content: "안녕하세요. 무엇을 도와드릴까요?",
        timestamp: now,
      },
      db as never
    );

    expect(result.commentId).toBe("comment-2");
    expect(tx.chatConversation.update).toHaveBeenCalledWith({
      where: { id: "conversation-1" },
      data: expect.objectContaining({
        status: "WAITING_CUSTOMER",
      }),
    });
    expect(tx.chatEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: "conversation-1",
        type: "message.created",
      }),
    });
  });

  it("filters internal notes out of the customer chat thread", async () => {
    prismaMock.chatConversation.findUnique.mockResolvedValue({
      id: "conversation-1",
      ticket: {
        comments: [],
      },
    });

    await getChatConversationForCustomer("conversation-1");

    expect(prismaMock.chatConversation.findUnique).toHaveBeenCalledWith({
      where: { id: "conversation-1" },
      include: {
        ticket: {
          include: {
            assignee: {
              select: { id: true, name: true },
            },
            comments: {
              where: { isInternal: false },
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
  });
});
