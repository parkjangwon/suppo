import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import {
  generateAnalyticsInsight,
  AnalyticsMetrics,
} from "@/lib/ai/analytics-insight";
import { getPeriodFromPreset } from "@/lib/reports/date-range";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validPresets: Array<"7d" | "30d" | "90d"> = ["7d", "30d", "90d"];
    const preset: "7d" | "30d" | "90d" = validPresets.includes(body.preset)
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
      prisma.customerSatisfaction.aggregate({
        _avg: { rating: true },
        _count: true,
        where: { submittedAt: { gte: from, lte: to } },
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
      .map((c: { categoryId: string | null }) => c.categoryId)
      .filter(Boolean) as string[];
    const categoryNames = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = Object.fromEntries(
      categoryNames.map((c: { id: string; name: string }) => [c.id, c.name]),
    );
    const topCategories = categories.map((c: { categoryId: string | null; _count: { id: number } }) => ({
      name: categoryMap[c.categoryId!] ?? "미분류",
      count: c._count.id,
    }));

    // 상담원 이름 조회
    const agentIds = agentStats.map((a: { assigneeId: string | null }) => a.assigneeId).filter(Boolean) as string[];
    const agentNames = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true },
    });
    const agentMap = Object.fromEntries(agentNames.map((a: { id: string; name: string }) => [a.id, a.name]));
    const sortedAgents = agentStats.map((a: { assigneeId: string | null; _count: { id: number } }) => ({
      name: agentMap[a.assigneeId!] ?? "미배정",
      resolved: a._count.id,
      csatAvg: null,
    }));

    const totalSent = await prisma.customerSatisfaction.count({
      where: { submittedAt: { gte: from, lte: to } },
    });

    const metrics: AnalyticsMetrics = {
      preset,
      totalTickets,
      resolvedTickets,
      resolutionRate: totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0,
      avgFirstResponseMinutes: null,
      avgResolutionMinutes: null,
      csatAvg: csatAgg._avg.rating,
      csatResponseRate: totalTickets > 0 ? (totalSent / totalTickets) * 100 : 0,
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
