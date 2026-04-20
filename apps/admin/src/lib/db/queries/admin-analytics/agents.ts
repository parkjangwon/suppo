import { prisma } from "@suppo/db";
import { db } from "@suppo/db/raw";
import { DateRange, AgentPerformance, AgentPerformanceResponse } from "./contracts";

interface AgentTicketStats {
  agentId: string;
  ticketsHandled: bigint;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
}

export async function getAgentPerformance(
  dateRange: DateRange,
  includeInactive = false
): Promise<AgentPerformanceResponse> {
  const agents = await prisma.agent.findMany({
    where: includeInactive ? undefined : { isActive: true },
    select: {
      id: true,
      name: true,
    },
  });

  if (agents.length === 0) {
    return {
      agents: [],
      summary: {
        totalTickets: 0,
        avgFirstResponseMinutes: null,
        avgResolutionMinutes: null,
      },
    };
  }

  const agentIds = agents.map((a) => a.id);
  const fromISO = dateRange.from.toISOString();
  const toISO = dateRange.to.toISOString();

  const stats = await db.execute({
    sql: `
      SELECT
        t.assigneeId as agentId,
        COUNT(*) as ticketsHandled,
        AVG(
          CASE
            WHEN t.firstResponseAt IS NOT NULL
            THEN (julianday(t.firstResponseAt) - julianday(t.createdAt)) * 1440
            ELSE NULL
          END
        ) as avgFirstResponseMinutes,
        AVG(
          CASE
            WHEN t.resolvedAt IS NOT NULL OR t.closedAt IS NOT NULL
            THEN (julianday(COALESCE(t.resolvedAt, t.closedAt)) - julianday(t.createdAt)) * 1440
            ELSE NULL
          END
        ) as avgResolutionMinutes
      FROM Ticket t
      WHERE t.assigneeId IN (${agentIds.map(() => '?').join(',')})
        AND t.createdAt >= ?
        AND t.createdAt <= ?
      GROUP BY t.assigneeId
    `,
    args: [...agentIds, fromISO, toISO],
  });
  const typedStats: AgentTicketStats[] = stats.rows as AgentTicketStats[];

  const openTicketCounts = await prisma.ticket.groupBy({
    by: ["assigneeId"],
    where: {
      assigneeId: { in: agentIds },
      status: {
        in: ["OPEN", "IN_PROGRESS", "WAITING"],
      },
    },
    _count: {
      id: true,
    },
  });

  const openTicketMap = new Map(
    openTicketCounts.map((o) => [o.assigneeId, o._count.id])
  );

  const statsMap = new Map(typedStats.map((s) => [s.agentId, s]));

  const agentStats: AgentPerformance[] = agents.map((agent) => {
    const stat = statsMap.get(agent.id);
    return {
      agentId: agent.id,
      agentName: agent.name,
      ticketsHandled: stat ? Number(stat.ticketsHandled) : 0,
      openTickets: openTicketMap.get(agent.id) ?? 0,
      avgFirstResponseMinutes: stat?.avgFirstResponseMinutes 
        ? Number(stat.avgFirstResponseMinutes) 
        : null,
      avgResolutionMinutes: stat?.avgResolutionMinutes 
        ? Number(stat.avgResolutionMinutes) 
        : null,
    };
  });

  const totalTickets = agentStats.reduce((sum, a) => sum + a.ticketsHandled, 0);
  const validResponseTimes = agentStats.filter((a) => a.avgFirstResponseMinutes !== null);
  const validResolutionTimes = agentStats.filter((a) => a.avgResolutionMinutes !== null);

  const summaryAvgFirstResponse = validResponseTimes.length > 0
    ? validResponseTimes.reduce((sum, a) => sum + (a.avgFirstResponseMinutes ?? 0), 0) / validResponseTimes.length
    : null;

  const summaryAvgResolution = validResolutionTimes.length > 0
    ? validResolutionTimes.reduce((sum, a) => sum + (a.avgResolutionMinutes ?? 0), 0) / validResolutionTimes.length
    : null;

  return {
    agents: agentStats,
    summary: {
      totalTickets,
      avgFirstResponseMinutes: summaryAvgFirstResponse,
      avgResolutionMinutes: summaryAvgResolution,
    },
  };
}
