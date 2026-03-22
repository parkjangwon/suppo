import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { generateDashboardBrief } from "@/lib/ai/dashboard-brief";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const [
      todayCreated,
      todayResolved,
      openTickets,
      urgentTickets,
      slaAtRiskCount,
      activeAgents,
      absentAgents,
      csatAgg,
    ] = await Promise.all([
      prisma.ticket.count({ where: { createdAt: { gte: today } } }),
      prisma.ticket.count({ where: { resolvedAt: { gte: today } } }),
      prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } } }),
      prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] }, priority: "URGENT" } }),
      prisma.sLAClock.count({
        where: {
          status: "RUNNING",
          breachedAt: null,
          deadlineAt: { lte: twoHoursLater, gte: new Date() },
        },
      }),
      prisma.agent.count({ where: { isActive: true } }),
      prisma.agentAbsence.count({
        where: {
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      }),
      prisma.customerSatisfaction.aggregate({
        _avg: { rating: true },
        where: { submittedAt: { gte: today } },
      }),
    ]);

    const result = await generateDashboardBrief({
      todayCreated,
      todayResolved,
      openTickets,
      urgentTickets,
      slaAtRiskCount,
      avgFirstResponseMinutes: null, // 복잡한 집계 — null로 전달
      csatAvg: csatAgg._avg.rating,
      activeAgents,
      absentAgents,
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error("dashboard-brief API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
