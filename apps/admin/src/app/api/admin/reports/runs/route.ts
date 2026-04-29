import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { ReportType, ReportFormat, ReportRunStatus } from "@prisma/client";
import { processReport, createPendingReport } from "@/lib/reports/process-runs";
import { getPeriodFromPreset, generatePeriodKey } from "@/lib/reports/date-range";

const createReportSchema = z.object({
  reportType: z.enum(["OPERATIONAL", "CUSTOMER"]),
  format: z.enum(["EXCEL"]),
  preset: z.enum(["7d", "30d", "90d", "this_week", "this_month", "last_week", "last_month", "custom"]),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const reportType = searchParams.get("reportType");

    const where: { status?: ReportRunStatus; reportType?: ReportType } = {};
    if (status) where.status = status as ReportRunStatus;
    if (reportType) where.reportType = reportType as ReportType;

    const reports = await prisma.generatedReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        requestedBy: {
          select: { name: true, email: true },
        },
        schedule: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createReportSchema.parse(body);

    let period;
    if (data.preset === "custom" && data.dateFrom && data.dateTo) {
      period = {
        from: new Date(data.dateFrom),
        to: new Date(data.dateTo),
      };
    } else {
      period = getPeriodFromPreset(data.preset);
    }

    const periodKey = generatePeriodKey(period, "WEEKLY");

    const reportId = await createPendingReport({
      reportType: data.reportType as ReportType,
      format: data.format as ReportFormat,
      period,
      periodKey,
      requestedById: session.user.id,
      triggerSource: "MANUAL",
    });

    processReport({
      reportId,
      reportType: data.reportType as ReportType,
      format: data.format as ReportFormat,
      period,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      reportId,
      message: "Report generation started",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }

    console.error("Failed to create report:", error);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}
