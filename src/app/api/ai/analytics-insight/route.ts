import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import {
  generateAnalyticsInsight,
  AnalyticsMetrics,
} from "@/lib/ai/analytics-insight";
import { getPeriodFromPreset } from "@/lib/reports/date-range";
import type { DatePreset } from "@/lib/db/queries/admin-analytics/contracts";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const preset: DatePreset = ["7d", "30d", "90d"].includes(body.preset)
      ? body.preset
      : "30d";

    const { from, to } = getPeriodFromPreset(preset);

    const [
      totalTickets,
      resolvedTickets,
      csatAgg,
      categories,
      agentStats,
    ] = await Promise.all([
      prisma.ticket.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.ticket.count({
        where: {
          createdAt: { gte: from, lte: to },
          status: { in: ["RESOLVED", "CLOSED"] },
        },
      }),
      prisma.cSATResponse.aggregate({
        _avg: { score: true },
        _count: { id: true },
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.ticket.groupBy({
        by: ["categoryId"],
        _count: { id: true },
        where: {
          createdAt: { gte: from, lte: to },
          categoryId: { not: null },
        },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      prisma.ticket.groupBy({
        by: ["assigneeId"],
        _count: { id: true },
        where: {
          createdAt: { gte: from, lte: to },
          assigneeId: { not: null },
          status: { in: ["RESOLVED", "CLOSED"] },
        },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);

    // 카테고리 이름 조회
    const categoryIds = categories
      .map((c) => c.categoryId)
      .filter(Boolean) as string[];
    const categoryNames = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = Object.fromEntries(
      categoryNames.map((c) => [c.id, c.name]),
    );
    const topCategories = categories.map((c) => ({
      name: categoryMap[c.categoryId!] ?? "미분류",
      count: c._count.id,
    }));

    // 상담원 이름 조회
    const agentIds = agentStats.map((a) => a.assigneeId).filter(Boolean) as string[];
    const agentNames = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true },
    });
    const agentMap = Object.fromEntries(agentNames.map((a) => [a.id, a.name]));
    const sortedAgents = agentStats.map((a) => ({
      name: agentMap[a.assigneeId!] ?? "미배정",
      resolved: a._count.id,
      csatAvg: null,
    }));

    const totalSent = await prisma.cSATResponse.count({
      where: { createdAt: { gte: from, lte: to } },
    });
    const totalTicketsForRate = totalTickets || 1;

    const metrics: AnalyticsMetrics = {
      preset,
      totalTickets,
      resolvedTickets,
      resolutionRate: totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0,
      avgFirstResponseMinutes: null,
      avgResolutionMinutes: null,
      csatAvg: csatAgg._avg.score,
      csatResponseRate: (totalSent / totalTicketsForRate) * 100,
      topCategories,
      topAgents: sortedAgents.slice(0, 3),
      bottomAgents: sortedAgents.slice(-3).reverse(),
    };

    const result = await generateAnalyticsInsight(metrics);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("analytics-insight API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
