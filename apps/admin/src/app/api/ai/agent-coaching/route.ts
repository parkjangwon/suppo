import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { generateAgentCoaching } from "@/lib/ai/agent-coaching";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        assignedTickets: {
          where: { createdAt: { gte: thirtyDaysAgo } },
          select: { id: true, status: true, categoryId: true },
        },
        categories: {
          include: { category: { select: { name: true } } },
          take: 1,
          orderBy: { category: { name: "asc" } },
        },
      },
    });

    const currentCounts = await prisma.ticket.groupBy({
      by: ["assigneeId"],
      _count: { id: true },
      where: {
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] },
        assigneeId: { not: null },
      },
    });

    const currentMap = Object.fromEntries(
      currentCounts.map((c) => [c.assigneeId!, c._count.id]),
    );

    const agentStats = agents.map((a) => {
      const resolved = a.assignedTickets.filter((t) =>
        ["RESOLVED", "CLOSED"].includes(t.status),
      ).length;
      return {
        name: a.name,
        ticketsHandled: a.assignedTickets.length,
        resolved,
        csatAvg: null,
        avgFirstResponseMinutes: null,
        currentTickets: currentMap[a.id] ?? 0,
        topCategory: a.categories[0]?.category.name ?? null,
      };
    });

    const result = await generateAgentCoaching(agentStats);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("agent-coaching API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
