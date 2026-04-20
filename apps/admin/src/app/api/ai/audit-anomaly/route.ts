import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { generateAuditAnomalyReport } from "@/lib/ai/audit-anomaly";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { search, action, resourceType, startDate, endDate } = body;

    const where: any = {};
    if (search) {
      where.OR = [
        { actorName: { contains: search } },
        { actorEmail: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (action && action !== "ALL") where.action = action;
    if (resourceType && resourceType !== "ALL") where.resourceType = resourceType;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        actorName: true,
        actorEmail: true,
        action: true,
        resourceType: true,
        resourceId: true,
        description: true,
        createdAt: true,
        // oldValue, newValue 제외 (민감 데이터)
      },
    });

    const entries = logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    }));

    const result = await generateAuditAnomalyReport(entries);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("audit-anomaly API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
