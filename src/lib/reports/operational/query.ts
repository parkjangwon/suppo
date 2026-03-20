import { prisma } from "@/lib/db/client";
import { DateRange, OperationalReportData, AgentActivitySummary, DailyStat } from "../contracts";

export async function getOperationalReportData(
  period: DateRange
): Promise<OperationalReportData> {
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: period.from,
        lte: period.to,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const summary = calculateSummary(auditLogs);
  const agentActivities = calculateAgentActivities(auditLogs);
  const dailyStats = calculateDailyStats(auditLogs, period);

  return {
    period,
    summary,
    agentActivities,
    dailyStats,
  };
}

function calculateSummary(auditLogs: any[]) {
  const totalActions = auditLogs.length;
  const uniqueActors = new Set(auditLogs.map((log) => log.actorId)).size;

  const actionsByType: Record<string, number> = {};
  const actionsByResource: Record<string, number> = {};

  for (const log of auditLogs) {
    actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
    actionsByResource[log.resourceType] = (actionsByResource[log.resourceType] || 0) + 1;
  }

  return {
    totalActions,
    uniqueActors,
    actionsByType,
    actionsByResource,
  };
}

function calculateAgentActivities(auditLogs: any[]): AgentActivitySummary[] {
  const agentMap = new Map<string, any>();

  for (const log of auditLogs) {
    if (!agentMap.has(log.actorId)) {
      agentMap.set(log.actorId, {
        agentId: log.actorId,
        agentName: log.actorName,
        agentEmail: log.actorEmail,
        totalActions: 0,
        actionsByType: {},
        lastActivityAt: log.createdAt,
      });
    }

    const agent = agentMap.get(log.actorId);
    agent.totalActions++;
    agent.actionsByType[log.action] = (agent.actionsByType[log.action] || 0) + 1;

    if (new Date(log.createdAt) > new Date(agent.lastActivityAt)) {
      agent.lastActivityAt = log.createdAt;
    }
  }

  return Array.from(agentMap.values()).sort((a, b) => b.totalActions - a.totalActions);
}

function calculateDailyStats(auditLogs: any[], period: DateRange): DailyStat[] {
  const dailyMap = new Map<string, { totalActions: number; uniqueActors: Set<string> }>();

  const current = new Date(period.from);
  while (current <= period.to) {
    const dateKey = current.toISOString().split("T")[0];
    dailyMap.set(dateKey, { totalActions: 0, uniqueActors: new Set() });
    current.setDate(current.getDate() + 1);
  }

  for (const log of auditLogs) {
    const dateKey = new Date(log.createdAt).toISOString().split("T")[0];
    const day = dailyMap.get(dateKey);
    if (day) {
      day.totalActions++;
      day.uniqueActors.add(log.actorId);
    }
  }

  return Array.from(dailyMap.entries())
    .map(([date, stats]) => ({
      date,
      totalActions: stats.totalActions,
      uniqueActors: stats.uniqueActors.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
