import type { PrismaClient } from "@prisma/client";

import { pickAssignee, type CandidateAgent } from "@crinity/shared/assignment/pick-assignee";
import { prisma } from "@crinity/db";
import { logActivity } from "@crinity/shared/tickets/activity";

const REASSIGNABLE_STATUSES: Array<"OPEN" | "IN_PROGRESS" | "WAITING"> = ["OPEN", "IN_PROGRESS", "WAITING"];

interface DeactivateAgentOptions {
  actorAgentId?: string;
  reason?: string;
}

interface DeactivateAgentResult {
  deactivatedAgentId: string;
  reassignedCount: number;
  unassignedCount: number;
  totalProcessed: number;
}

type DeactivateDbClient = Pick<PrismaClient, "$transaction">;

function toCandidates(
  rows: Array<{
    id: string;
    name: string;
    maxTickets: number;
    createdAt: Date;
    lastAssignedAt: Date | null;
    _count: { assignedTickets: number };
  }>
): CandidateAgent[] {
  return rows.map((row) => {
    const currentTickets = row._count.assignedTickets;
    const loadRatio = row.maxTickets > 0 ? currentTickets / row.maxTickets : 1;

    return {
      id: row.id,
      name: row.name,
      maxTickets: row.maxTickets,
      currentTickets,
      loadRatio,
      lastAssignedAt: row.lastAssignedAt ?? row.createdAt
    };
  });
}

export async function deactivateAgent(
  agentId: string,
  options: DeactivateAgentOptions = {},
  db: DeactivateDbClient = prisma
): Promise<DeactivateAgentResult> {
  return db.$transaction(async (tx) => {
    const sourceAgent = await tx.agent.findUnique({
      where: { id: agentId },
      select: { id: true, isActive: true, role: true }
    });

    if (!sourceAgent) {
      throw new Error("상담원을 찾을 수 없습니다");
    }

    if (!sourceAgent.isActive) {
      throw new Error("이미 비활성화된 상담원입니다");
    }

    const tickets = await tx.ticket.findMany({
      where: {
        assigneeId: agentId,
        status: { in: REASSIGNABLE_STATUSES }
      },
      select: {
        id: true,
        categoryId: true,
        assigneeId: true
      }
    });

    const candidateCache = new Map<string | null, CandidateAgent[]>();
    let reassignedCount = 0;
    let unassignedCount = 0;

    for (const ticket of tickets) {
      const fromAgentId = ticket.assigneeId;
      if (!fromAgentId) {
        continue;
      }

      let candidates = candidateCache.get(ticket.categoryId);
      if (!candidates) {
        if (!ticket.categoryId) {
          candidates = [];
        } else {
          const rows = await tx.agent.findMany({
            where: {
              isActive: true,
              id: { not: agentId },
              role: "AGENT",
              categories: {
                some: { categoryId: ticket.categoryId }
              }
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
                        in: REASSIGNABLE_STATUSES
                      }
                    }
                  }
                }
              }
            }
          });

          candidates = toCandidates(rows);
        }
        candidateCache.set(ticket.categoryId, candidates);
      }

      const assignee = pickAssignee(candidates, ticket.categoryId ?? undefined);

      if (assignee) {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { assigneeId: assignee.id }
        });

        await tx.ticketTransfer.create({
          data: {
            ticketId: ticket.id,
            fromAgentId,
            toAgentId: assignee.id,
            reason: options.reason ?? "처리중인 티켓 재할당"
          }
        });

        await tx.agent.update({
          where: { id: assignee.id },
          data: { lastAssignedAt: new Date() }
        });

        await logActivity(
          {
            ticketId: ticket.id,
            actorType: "AGENT",
            actorId: options.actorAgentId ?? fromAgentId,
            action: "TRANSFERRED",
            oldValue: fromAgentId,
            newValue: assignee.id
          },
          tx
        );

        reassignedCount += 1;

        assignee.currentTickets += 1;
        assignee.loadRatio = assignee.maxTickets > 0 ? assignee.currentTickets / assignee.maxTickets : 1;
        assignee.lastAssignedAt = new Date();
      } else {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { assigneeId: null }
        });

        await logActivity(
          {
            ticketId: ticket.id,
            actorType: "AGENT",
            actorId: options.actorAgentId ?? fromAgentId,
            action: "TRANSFERRED",
            oldValue: fromAgentId,
            newValue: "UNASSIGNED"
          },
          tx
        );

        unassignedCount += 1;
      }
    }

    await tx.agent.update({
      where: { id: agentId },
      data: { isActive: false }
    });

    return {
      deactivatedAgentId: agentId,
      reassignedCount,
      unassignedCount,
      totalProcessed: reassignedCount + unassignedCount
    };
  });
}

export type { DeactivateAgentOptions, DeactivateAgentResult };
