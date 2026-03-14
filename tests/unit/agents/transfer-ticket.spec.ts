import { describe, expect, it, vi } from "vitest";

import { transferTicket } from "@/lib/agents/transfer-ticket";

describe("transferTicket", () => {
  it("creates transfer history and updates assignee", async () => {
    const ticket = { id: "ticket-1", assigneeId: "agent-a" };
    const toAgent = { id: "agent-b", isActive: true, role: "AGENT" as const };
    const transferRecord = { id: "transfer-1" };

    const tx = {
      ticket: {
        findUnique: vi.fn().mockResolvedValue(ticket),
        update: vi.fn().mockResolvedValue({ id: "ticket-1", assigneeId: "agent-b" })
      },
      agent: {
        findUnique: vi.fn().mockResolvedValue(toAgent),
        update: vi.fn().mockResolvedValue({ id: "agent-b" })
      },
      ticketTransfer: {
        create: vi.fn().mockResolvedValue(transferRecord)
      },
      ticketActivity: {
        create: vi.fn().mockResolvedValue({ id: "activity-1" })
      }
    };

    const db = {
      $transaction: vi.fn().mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx))
    };

    const result = await transferTicket(
      {
        ticketId: "ticket-1",
        toAgentId: "agent-b",
        reason: "Specialized domain handoff",
        actorAgentId: "admin-1"
      },
      db
    );

    expect(result.transferId).toBe("transfer-1");
    expect(result.fromAgentId).toBe("agent-a");
    expect(result.toAgentId).toBe("agent-b");
    expect(tx.ticket.update).toHaveBeenCalledWith({
      where: { id: "ticket-1" },
      data: { assigneeId: "agent-b" }
    });
    expect(tx.ticketTransfer.create).toHaveBeenCalledWith({
      data: {
        ticketId: "ticket-1",
        fromAgentId: "agent-a",
        toAgentId: "agent-b",
        reason: "Specialized domain handoff"
      }
    });
  });

  it("rejects transfer when ticket is not currently assigned", async () => {
    const tx = {
      ticket: {
        findUnique: vi.fn().mockResolvedValue({ id: "ticket-1", assigneeId: null }),
        update: vi.fn()
      },
      agent: {
        findUnique: vi.fn(),
        update: vi.fn()
      },
      ticketTransfer: {
        create: vi.fn()
      },
      ticketActivity: {
        create: vi.fn()
      }
    };

    const db = {
      $transaction: vi.fn().mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx))
    };

    await expect(
      transferTicket(
        {
          ticketId: "ticket-1",
          toAgentId: "agent-b"
        },
        db
      )
    ).rejects.toThrow("현재 담당자가 없는 티켓은 양도할 수 없습니다");
  });
});
