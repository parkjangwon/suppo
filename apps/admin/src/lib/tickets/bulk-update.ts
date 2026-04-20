import { TicketPriority, TicketStatus } from "@prisma/client";
import { prisma } from "@suppo/db";

interface BulkTicketUpdates {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
}

interface BulkUpdateTicketsParams {
  ticketIds: string[];
  actorId: string;
  updates: BulkTicketUpdates;
}

interface BulkUpdateTx {
  ticket: {
    findMany: (args: { where: { id: { in: string[] } } }) => Promise<
      Array<{
        id: string;
        status: TicketStatus;
        priority: TicketPriority;
        assigneeId: string | null;
      }>
    >;
    update: (args: {
      where: { id: string };
      data: {
        status?: TicketStatus;
        priority?: TicketPriority;
        assigneeId?: string | null;
        updatedBy: string;
      };
    }) => Promise<unknown>;
  };
  ticketActivity: {
    create: (args: {
      data: {
        ticketId: string;
        actorType: "AGENT";
        actorId: string;
        action: "STATUS_CHANGED" | "PRIORITY_CHANGED" | "ASSIGNED" | "TRANSFERRED";
        oldValue: string;
        newValue: string;
      };
    }) => Promise<unknown>;
  };
  ticketTransfer: {
    create: (args: {
      data: {
        ticketId: string;
        fromAgentId: string;
        toAgentId: string;
        reason: string;
      };
    }) => Promise<unknown>;
  };
}

interface BulkUpdateDb {
  $transaction: <T>(callback: (tx: BulkUpdateTx) => Promise<T>) => Promise<T>;
}

function hasRequestedChanges(updates: BulkTicketUpdates) {
  return (
    updates.status !== undefined ||
    updates.priority !== undefined ||
    updates.assigneeId !== undefined
  );
}

export async function bulkUpdateTickets(
  params: BulkUpdateTicketsParams,
  db: BulkUpdateDb = prisma as unknown as BulkUpdateDb
) {
  const { ticketIds, actorId, updates } = params;

  if (ticketIds.length === 0) {
    throw new Error("선택된 티켓이 없습니다");
  }

  if (!hasRequestedChanges(updates)) {
    throw new Error("변경할 항목이 없습니다");
  }

  return db.$transaction(async (tx) => {
    const tickets = await tx.ticket.findMany({
      where: {
        id: { in: ticketIds },
      },
    });

    if (tickets.length !== ticketIds.length) {
      throw new Error("일부 티켓을 찾을 수 없습니다");
    }

    for (const ticket of tickets) {
      const updateData: {
        status?: TicketStatus;
        priority?: TicketPriority;
        assigneeId?: string | null;
        updatedBy: string;
      } = {
        updatedBy: actorId,
      };

      if (updates.status && updates.status !== ticket.status) {
        updateData.status = updates.status;
        await tx.ticketActivity.create({
          data: {
            ticketId: ticket.id,
            actorType: "AGENT",
            actorId,
            action: "STATUS_CHANGED",
            oldValue: ticket.status,
            newValue: updates.status,
          },
        });
      }

      if (updates.priority && updates.priority !== ticket.priority) {
        updateData.priority = updates.priority;
        await tx.ticketActivity.create({
          data: {
            ticketId: ticket.id,
            actorType: "AGENT",
            actorId,
            action: "PRIORITY_CHANGED",
            oldValue: ticket.priority,
            newValue: updates.priority,
          },
        });
      }

      if (updates.assigneeId !== undefined && updates.assigneeId !== ticket.assigneeId) {
        updateData.assigneeId = updates.assigneeId;

        if (ticket.assigneeId && updates.assigneeId) {
          await tx.ticketTransfer.create({
            data: {
              ticketId: ticket.id,
              fromAgentId: ticket.assigneeId,
              toAgentId: updates.assigneeId,
              reason: "벌크 작업으로 담당자 변경",
            },
          });

          await tx.ticketActivity.create({
            data: {
              ticketId: ticket.id,
              actorType: "AGENT",
              actorId,
              action: "TRANSFERRED",
              oldValue: ticket.assigneeId,
              newValue: updates.assigneeId,
            },
          });
        } else {
          await tx.ticketActivity.create({
            data: {
              ticketId: ticket.id,
              actorType: "AGENT",
              actorId,
              action: "ASSIGNED",
              oldValue: ticket.assigneeId || "unassigned",
              newValue: updates.assigneeId || "unassigned",
            },
          });
        }
      }

      await tx.ticket.update({
        where: { id: ticket.id },
        data: updateData,
      });
    }

    return {
      updatedCount: tickets.length,
      ticketIds,
    };
  });
}
