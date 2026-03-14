import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/tickets/[id]/transfer/route";

vi.mock("@/lib/auth/session", () => ({
  getBackofficeSession: vi.fn().mockResolvedValue({
    user: {
      id: "session-1",
      email: "agent@crinity.com",
      name: "Agent",
      role: "AGENT",
      agentId: "agent-1"
    }
  })
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    ticket: {
      findUnique: vi.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "CRN-0000000001",
        customerName: "Customer",
        customerEmail: "customer@example.com",
        customerPhone: null,
        subject: "Subject",
        description: "Description",
        categoryId: "cat-1",
        priority: "HIGH",
        status: "OPEN",
        assigneeId: "agent-1",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        resolvedAt: null,
        closedAt: null
      })
    }
  }
}));

vi.mock("@/lib/agents/transfer-ticket", () => ({
  transferTicket: vi.fn().mockResolvedValue({
    transferId: "transfer-1",
    ticketId: "ticket-1",
    fromAgentId: "agent-1",
    toAgentId: "agent-2"
  })
}));

describe("Ticket transfer API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transfers ticket for assigned agent", async () => {
    const request = new NextRequest("http://localhost/api/tickets/ticket-1/transfer", {
      method: "POST",
      body: JSON.stringify({ toAgentId: "agent-2", reason: "Escalation" })
    });

    const response = await POST(request, { params: Promise.resolve({ id: "ticket-1" }) } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.result.transferId).toBe("transfer-1");
  });

  it("rejects when current user is not assignee", async () => {
    const { prisma } = await import("@/lib/db/client");
    vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce({
      id: "ticket-1",
      ticketNumber: "CRN-0000000001",
      customerName: "Customer",
      customerEmail: "customer@example.com",
      customerPhone: null,
      subject: "Subject",
      description: "Description",
      categoryId: "cat-1",
      priority: "HIGH",
      status: "OPEN",
      assigneeId: "agent-x",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      resolvedAt: null,
      closedAt: null
    });

    const request = new NextRequest("http://localhost/api/tickets/ticket-1/transfer", {
      method: "POST",
      body: JSON.stringify({ toAgentId: "agent-2" })
    });

    const response = await POST(request, { params: Promise.resolve({ id: "ticket-1" }) } as never);
    expect(response.status).toBe(403);
  });
});
