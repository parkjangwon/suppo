import { describe, expect, it, vi } from "vitest";

import { bulkUpdateTickets } from "@/lib/tickets/bulk-update";

describe("bulkUpdateTickets", () => {
  it("updates multiple tickets and writes activity logs", async () => {
    const tickets = [
      {
        id: "ticket-1",
        status: "OPEN",
        priority: "MEDIUM",
        assigneeId: "agent-a",
      },
      {
        id: "ticket-2",
        status: "WAITING",
        priority: "LOW",
        assigneeId: "agent-a",
      },
    ];

    const tx = {
      ticket: {
        findMany: vi.fn().mockResolvedValue(tickets),
        update: vi.fn().mockResolvedValue({}),
      },
      ticketActivity: {
        create: vi.fn().mockResolvedValue({}),
      },
      ticketTransfer: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    const db = {
      $transaction: vi.fn().mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };

    const result = await bulkUpdateTickets(
      {
        ticketIds: ["ticket-1", "ticket-2"],
        actorId: "admin-1",
        updates: {
          status: "IN_PROGRESS",
          priority: "HIGH",
          assigneeId: "agent-b",
        },
      },
      db
    );

    expect(result.updatedCount).toBe(2);
    expect(tx.ticket.update).toHaveBeenCalledTimes(2);
    expect(tx.ticketTransfer.create).toHaveBeenCalledTimes(2);
    expect(tx.ticketActivity.create).toHaveBeenCalledTimes(6);
  });

  it("rejects empty bulk updates", async () => {
    const db = {
      $transaction: vi.fn(),
    };

    await expect(
      bulkUpdateTickets(
        {
          ticketIds: ["ticket-1"],
          actorId: "admin-1",
          updates: {},
        },
        db
      )
    ).rejects.toThrow("변경할 항목이 없습니다");
  });
});
