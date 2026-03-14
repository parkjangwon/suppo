import { prisma } from "@/lib/db/client";
import { logActivity, type LoggedActivity } from "@/lib/tickets/activity";

interface TransferTicketInput {
  ticketId: string;
  toAgentId: string;
  reason?: string;
  actorAgentId?: string;
}

interface TransferResult {
  transferId: string;
  ticketId: string;
  fromAgentId: string;
  toAgentId: string;
}

interface TransferTxClient {
  ticket: {
    findUnique: (args: {
      where: { id: string };
      select: { id: true; assigneeId: true };
    }) => Promise<{ id: string; assigneeId: string | null } | null>;
    update: (args: {
      where: { id: string };
      data: { assigneeId: string };
    }) => Promise<unknown>;
  };
  agent: {
    findUnique: (args: {
      where: { id: string };
      select: { id: true; isActive: true };
    }) => Promise<{ id: string; isActive: boolean } | null>;
    update: (args: { where: { id: string }; data: { lastAssignedAt: Date } }) => Promise<unknown>;
  };
  ticketTransfer: {
    create: (args: {
      data: {
        ticketId: string;
        fromAgentId: string;
        toAgentId: string;
        reason?: string;
      };
    }) => Promise<{ id: string }>;
  };
  ticketActivity: {
    create: (args: {
      data: {
        ticketId: string;
        actorType: "AGENT" | "CUSTOMER";
        actorId?: string;
        action: "CREATED" | "ASSIGNED" | "STATUS_CHANGED" | "PRIORITY_CHANGED" | "TRANSFERRED";
        oldValue?: string;
        newValue?: string;
      };
    }) => Promise<LoggedActivity>;
  };
}

interface TransferDbClient {
  $transaction: <T>(callback: (client: TransferTxClient) => Promise<T>) => Promise<T>;
}

export async function transferTicket(
  input: TransferTicketInput,
  db: TransferDbClient = prisma
): Promise<TransferResult> {
  return db.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: input.ticketId },
      select: { id: true, assigneeId: true }
    });

    if (!ticket) {
      throw new Error("티켓을 찾을 수 없습니다");
    }

    if (!ticket.assigneeId) {
      throw new Error("현재 담당자가 없는 티켓은 양도할 수 없습니다");
    }

    if (ticket.assigneeId === input.toAgentId) {
      throw new Error("같은 상담원에게는 양도할 수 없습니다");
    }

    const toAgent = await tx.agent.findUnique({
      where: { id: input.toAgentId },
      select: { id: true, isActive: true }
    });

    if (!toAgent || !toAgent.isActive) {
      throw new Error("양도 대상 상담원이 비활성화되었거나 존재하지 않습니다");
    }

    await tx.ticket.update({
      where: { id: ticket.id },
      data: { assigneeId: input.toAgentId }
    });

    const transfer = await tx.ticketTransfer.create({
      data: {
        ticketId: ticket.id,
        fromAgentId: ticket.assigneeId,
        toAgentId: input.toAgentId,
        reason: input.reason
      }
    });

    await logActivity(
      {
        ticketId: ticket.id,
        actorType: "AGENT",
        actorId: input.actorAgentId ?? ticket.assigneeId,
        action: "TRANSFERRED",
        oldValue: ticket.assigneeId,
        newValue: input.toAgentId
      },
      tx
    );

    await tx.agent.update({
      where: { id: input.toAgentId },
      data: { lastAssignedAt: new Date() }
    });

    return {
      transferId: transfer.id,
      ticketId: ticket.id,
      fromAgentId: ticket.assigneeId,
      toAgentId: input.toAgentId
    };
  });
}

export type { TransferTicketInput, TransferResult };
