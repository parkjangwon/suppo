import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindManyRules,
  mockFindManyTickets,
  mockFindUniqueTicket,
  mockTransaction,
  mockTicketUpdate,
  mockTicketActivityCreate,
  mockTicketTransferCreate,
  mockEmailDeliveryCreate,
} = vi.hoisted(() => ({
  mockFindManyRules: vi.fn(),
  mockFindManyTickets: vi.fn(),
  mockFindUniqueTicket: vi.fn(),
  mockTransaction: vi.fn(),
  mockTicketUpdate: vi.fn(),
  mockTicketActivityCreate: vi.fn(),
  mockTicketTransferCreate: vi.fn(),
  mockEmailDeliveryCreate: vi.fn(),
}));

vi.mock("@suppo/db", () => ({
  prisma: {
    automationRule: {
      findMany: mockFindManyRules,
    },
    ticket: {
      findMany: mockFindManyTickets,
      findUnique: mockFindUniqueTicket,
    },
    $transaction: mockTransaction,
  },
}));

import { executeScheduledAutomationRules } from "@/lib/automation/engine";

describe("executeScheduledAutomationRules", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    mockFindManyRules.mockReset();
    mockFindManyTickets.mockReset();
    mockFindUniqueTicket.mockReset();
    mockTransaction.mockReset();
    mockTicketUpdate.mockReset();
    mockTicketActivityCreate.mockReset();
    mockTicketTransferCreate.mockReset();
    mockEmailDeliveryCreate.mockReset();

    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        ticket: {
          update: mockTicketUpdate,
        },
        ticketActivity: {
          create: mockTicketActivityCreate,
        },
        ticketTransfer: {
          create: mockTicketTransferCreate,
        },
        emailDelivery: {
          create: mockEmailDeliveryCreate,
        },
      })
    );
  });

  it("runs escalation actions for breached SLA tickets on scheduled rules", async () => {
    const now = new Date("2026-03-28T09:00:00.000Z");

    mockFindManyRules.mockResolvedValue([
      {
        id: "rule-1",
        name: "SLA breach escalation",
        description: null,
        triggerOn: "SCHEDULED",
        priority: 100,
        conditions: {
          slaState: "breached",
          status: "OPEN",
        },
        actions: {
          setPriority: "URGENT",
          setAssigneeId: "team-lead-1",
          addTags: ["sla:breached", "escalated:auto"],
          sendNotification: true,
        },
        createdById: "admin-1",
      },
    ]);

    mockFindManyTickets.mockResolvedValue([
      {
        id: "ticket-1",
        ticketNumber: "TKT-2026-000001",
        subject: "결제 장애",
        description: "긴급 확인 필요",
        customerEmail: "customer@example.com",
        priority: "HIGH",
        status: "OPEN",
        assigneeId: "agent-1",
        teamId: null,
        categoryId: null,
        tags: [],
        updatedBy: null,
        assignee: { id: "agent-1", name: "담당 상담원" },
        team: null,
        category: null,
        slaClocks: [
          {
            id: "clock-1",
            target: "RESOLUTION",
            status: "RUNNING",
            deadlineAt: new Date("2026-03-28T08:30:00.000Z"),
            breachedAt: new Date("2026-03-28T08:31:00.000Z"),
          },
        ],
      },
    ]);

    mockFindUniqueTicket.mockResolvedValue({
      id: "ticket-1",
      ticketNumber: "TKT-2026-000001",
      subject: "결제 장애",
      description: "긴급 확인 필요",
      customerEmail: "customer@example.com",
      priority: "HIGH",
      status: "OPEN",
      assigneeId: "agent-1",
      teamId: null,
      categoryId: null,
      tags: [],
      updatedBy: null,
      assignee: { id: "agent-1", name: "담당 상담원" },
      team: null,
      category: null,
    });

    const result = await executeScheduledAutomationRules({ now });

    expect(result.processedRules).toBe(1);
    expect(result.matchedTickets).toBe(1);
    expect(result.updatedTickets).toBe(1);
    expect(mockTicketUpdate).toHaveBeenCalledWith({
      where: { id: "ticket-1" },
      data: {
        priority: "URGENT",
        assigneeId: "team-lead-1",
        tags: ["sla:breached", "escalated:auto"],
        updatedBy: "admin-1",
      },
    });
    expect(mockTicketTransferCreate).toHaveBeenCalledWith({
      data: {
        ticketId: "ticket-1",
        fromAgentId: "agent-1",
        toAgentId: "team-lead-1",
        reason: '자동화 규칙 "SLA breach escalation" 실행',
      },
    });
    expect(mockEmailDeliveryCreate).toHaveBeenCalledOnce();
  });

  it("matches elapsed-time conditions for waiting tickets", async () => {
    const now = new Date("2026-03-28T09:00:00.000Z");

    mockFindManyRules.mockResolvedValue([
      {
        id: "rule-2",
        name: "Waiting follow-up",
        description: null,
        triggerOn: "SCHEDULED",
        priority: 50,
        conditions: {
          status: "WAITING",
          updatedHoursAgo: 24,
        },
        actions: {
          addTags: ["follow-up:due"],
        },
        createdById: "admin-1",
      },
    ]);

    mockFindManyTickets.mockResolvedValue([
      {
        id: "ticket-2",
        ticketNumber: "TKT-2026-000002",
        subject: "자료 회신 대기",
        description: "고객 회신 대기중",
        customerEmail: "waiting@example.com",
        priority: "MEDIUM",
        status: "WAITING",
        assigneeId: null,
        teamId: null,
        categoryId: null,
        tags: ["existing"],
        updatedAt: new Date("2026-03-27T08:00:00.000Z"),
        updatedBy: null,
        assignee: null,
        team: null,
        category: null,
        slaClocks: [],
      },
    ]);

    mockFindUniqueTicket.mockResolvedValue({
      id: "ticket-2",
      ticketNumber: "TKT-2026-000002",
      subject: "자료 회신 대기",
      description: "고객 회신 대기중",
      customerEmail: "waiting@example.com",
      priority: "MEDIUM",
      status: "WAITING",
      assigneeId: null,
      teamId: null,
      categoryId: null,
      tags: ["existing"],
      updatedAt: new Date("2026-03-27T08:00:00.000Z"),
      updatedBy: null,
      assignee: null,
      team: null,
      category: null,
    });

    const result = await executeScheduledAutomationRules({ now });

    expect(result.processedRules).toBe(1);
    expect(result.matchedTickets).toBe(1);
    expect(result.updatedTickets).toBe(1);
    expect(mockTicketUpdate).toHaveBeenCalledWith({
      where: { id: "ticket-2" },
      data: {
        tags: ["existing", "follow-up:due"],
        updatedBy: "admin-1",
      },
    });
  });
});
