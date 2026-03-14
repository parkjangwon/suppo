import { describe, expect, it, vi } from "vitest";

import { deactivateAgent } from "@/lib/agents/deactivate-agent";

describe("deactivateAgent", () => {
  it("deactivates agent and reassigns incomplete tickets", async () => {
    const tickets = [
      { id: "ticket-1", categoryId: "cat-a", assigneeId: "agent-source" },
      { id: "ticket-2", categoryId: "cat-a", assigneeId: "agent-source" }
    ];

    const candidates = [
      {
        id: "agent-target",
        name: "Target",
        maxTickets: 10,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        lastAssignedAt: new Date("2024-01-01T00:00:00.000Z"),
        _count: { assignedTickets: 1 }
      }
    ];

    const tx = {
      agent: {
        findUnique: vi.fn().mockResolvedValue({ id: "agent-source", isActive: true, role: "AGENT" as const }),
        update: vi.fn().mockResolvedValue({ id: "agent-source", isActive: false }),
        findMany: vi.fn().mockResolvedValue(candidates)
      },
      ticket: {
        findMany: vi.fn().mockResolvedValue(tickets),
        update: vi.fn().mockResolvedValue({ id: "ticket-1" })
      },
      ticketTransfer: {
        create: vi.fn().mockResolvedValue({ id: "transfer-1" })
      },
      ticketActivity: {
        create: vi.fn().mockResolvedValue({ id: "activity-1" })
      }
    };

    const db = {
      $transaction: vi.fn().mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx))
    };

    const result = await deactivateAgent("agent-source", { actorAgentId: "admin-1" }, db);

    expect(result.reassignedCount).toBe(2);
    expect(result.unassignedCount).toBe(0);
    expect(tx.agent.update).toHaveBeenCalledWith({
      where: { id: "agent-source" },
      data: { isActive: false }
    });
    expect(tx.ticketTransfer.create).toHaveBeenCalledTimes(2);
  });

  it("unassigns when no active candidates are available", async () => {
    const tx = {
      agent: {
        findUnique: vi.fn().mockResolvedValue({ id: "agent-source", isActive: true, role: "AGENT" as const }),
        update: vi.fn().mockResolvedValue({ id: "agent-source", isActive: false }),
        findMany: vi.fn().mockResolvedValue([])
      },
      ticket: {
        findMany: vi.fn().mockResolvedValue([{ id: "ticket-1", categoryId: "cat-a", assigneeId: "agent-source" }]),
        update: vi.fn().mockResolvedValue({ id: "ticket-1", assigneeId: null })
      },
      ticketTransfer: {
        create: vi.fn()
      },
      ticketActivity: {
        create: vi.fn().mockResolvedValue({ id: "activity-1" })
      }
    };

    const db = {
      $transaction: vi.fn().mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx))
    };

    const result = await deactivateAgent("agent-source", {}, db);

    expect(result.reassignedCount).toBe(0);
    expect(result.unassignedCount).toBe(1);
    expect(tx.ticket.update).toHaveBeenCalledWith({
      where: { id: "ticket-1" },
      data: { assigneeId: null }
    });
    expect(tx.ticketTransfer.create).not.toHaveBeenCalled();
  });
});
