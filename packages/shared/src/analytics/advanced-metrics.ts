// Advanced Analytics v2 - First Response Time, Resolution Time, Backlog
import { prisma } from "@suppo/db";

export interface AdvancedMetrics {
  period: string;
  firstResponseTime: number; // minutes
  resolutionTime: number; // minutes
  backlogCount: number;
  deflectionRate: number;
  portalAdoptionRate: number;
}

export async function calculateFirstResponseTime(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const tickets = await prisma.ticket.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      comments: { some: { authorId: { not: null } } }
    },
    include: {
      comments: {
        where: { authorId: { not: null } },
        orderBy: { createdAt: "asc" },
        take: 1
      }
    }
  });
  
  if (tickets.length === 0) return 0;
  
  const responseTimes = tickets.map(t => {
    const firstResponse = t.comments[0]?.createdAt;
    if (!firstResponse) return 0;
    return (firstResponse.getTime() - t.createdAt.getTime()) / (1000 * 60); // minutes
  }).filter(t => t > 0);
  
  return responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
}

export async function calculateResolutionTime(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const tickets = await prisma.ticket.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: "RESOLVED",
      resolvedAt: { not: null }
    }
  });
  
  if (tickets.length === 0) return 0;
  
  const resolutionTimes = tickets
    .filter(t => t.resolvedAt)
    .map(t => (t.resolvedAt!.getTime() - t.createdAt.getTime()) / (1000 * 60)); // minutes
  
  return resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
}

export async function getBacklogCount(): Promise<number> {
  return prisma.ticket.count({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] }
    }
  });
}

export async function calculateDeflectionRate(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const [kbViews, ticketsCreated] = await Promise.all([
    prisma.knowledgeArticle.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { viewCount: true }
    }),
    prisma.ticket.count({
      where: { createdAt: { gte: startDate, lte: endDate } }
    })
  ]);
  
  const views = kbViews._sum.viewCount || 0;
  if (views + ticketsCreated === 0) return 0;
  
  return Math.round((views / (views + ticketsCreated)) * 100);
}

export async function getAdvancedMetrics(
  startDate: Date,
  endDate: Date
): Promise<AdvancedMetrics> {
  const [frt, rt, backlog, deflection] = await Promise.all([
    calculateFirstResponseTime(startDate, endDate),
    calculateResolutionTime(startDate, endDate),
    getBacklogCount(),
    calculateDeflectionRate(startDate, endDate)
  ]);
  
  return {
    period: `${startDate.toISOString()}_${endDate.toISOString()}`,
    firstResponseTime: Math.round(frt),
    resolutionTime: Math.round(rt),
    backlogCount: backlog,
    deflectionRate: deflection,
    portalAdoptionRate: 0 // Would track portal vs email ticket creation
  };
}
