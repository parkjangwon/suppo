import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { getCSATTrend } from "@/lib/db/queries/admin-analytics/csat";
import { getCategoryFrequency } from "@/lib/db/queries/admin-analytics/categories";
import { getDateRangeFromPreset } from "@/lib/db/queries/admin-analytics/filters";
import { prisma } from "@suppo/db";
import { db } from "@suppo/db/raw";

const querySchema = z.object({
  preset: z.enum(["7d", "30d", "90d", "custom"]).default("30d"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      preset: searchParams.get("preset") ?? "30d",
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { preset, from, to } = parsed.data;
    
    let dateRange;
    if (preset === "custom" && from && to) {
      dateRange = {
        from: new Date(from),
        to: new Date(to),
      };
    } else {
      dateRange = getDateRangeFromPreset(preset);
    }

    const [kpi, csatTrend, categoryFrequency] = await Promise.all([
      getOverviewKPI(dateRange),
      getCSATTrend(dateRange, "day"),
      getCategoryFrequency(dateRange),
    ]);

    return NextResponse.json({
      kpi,
      csatTrend: csatTrend.trend,
      csatSummary: csatTrend.summary,
      categoryFrequency: categoryFrequency.categories,
    });
  } catch (error) {
    console.error("Overview analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch overview analytics" },
      { status: 500 }
    );
  }
}

async function getOverviewKPI(dateRange: { from: Date; to: Date }) {
  const [totalTickets, avgResponseAgg, avgResolutionAgg, csatAgg, repeatCustomers, vipCustomers] = await Promise.all([
    prisma.ticket.count({
      where: {
        createdAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      },
    }),
    db.execute({
      sql: `
        SELECT AVG(EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")) / 60) as "avgMinutes"
        FROM "Ticket"
        WHERE "firstResponseAt" IS NOT NULL
          AND "createdAt" >= $1::timestamptz
          AND "createdAt" <= $2::timestamptz
      `,
      args: [dateRange.from.toISOString(), dateRange.to.toISOString()],
    }),
    db.execute({
      sql: `
        SELECT AVG(EXTRACT(EPOCH FROM (COALESCE("resolvedAt", "closedAt") - "createdAt")) / 3600) as "avgHours"
        FROM "Ticket"
        WHERE ("resolvedAt" IS NOT NULL OR "closedAt" IS NOT NULL)
          AND "createdAt" >= $1::timestamptz
          AND "createdAt" <= $2::timestamptz
      `,
      args: [dateRange.from.toISOString(), dateRange.to.toISOString()],
    }),
    prisma.customerSatisfaction.aggregate({
      where: {
        submittedAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      },
      _avg: {
        rating: true,
      },
    }),
    db.execute({
      sql: `
        SELECT COUNT(*) as count
        FROM (
          SELECT "customerEmail"
          FROM "Ticket"
          WHERE "createdAt" >= $1::timestamptz
            AND "createdAt" <= $2::timestamptz
          GROUP BY "customerEmail"
          HAVING COUNT(*) >= 2
        )
      `,
      args: [dateRange.from.toISOString(), dateRange.to.toISOString()],
    }),
    db.execute({
      sql: `
        SELECT COUNT(*) as count
        FROM (
          SELECT "customerEmail"
          FROM "Ticket"
          WHERE "createdAt" <= $1::timestamptz
          GROUP BY "customerEmail"
          HAVING COUNT(*) >= 10
             OR SUM(CASE WHEN "createdAt" >= $2::timestamptz THEN 1 ELSE 0 END) >= 5
        )
      `,
      args: [dateRange.to.toISOString(), new Date(dateRange.to.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()],
    }),
  ]);

  type RawResultSet = { rows: Record<string, unknown>[] };
  const responseTimeRows = (avgResponseAgg as RawResultSet).rows;
  const resolutionTimeRows = (avgResolutionAgg as RawResultSet).rows;
  const repeatRows = (repeatCustomers as RawResultSet).rows;
  const vipRows = (vipCustomers as RawResultSet).rows;

  return {
    totalTickets,
    avgFirstResponseMinutes: responseTimeRows[0]?.avgMinutes ?? null,
    avgResolutionHours: resolutionTimeRows[0]?.avgHours ?? null,
    avgCsat: csatAgg._avg.rating,
    repeatCustomers: Number(repeatRows[0]?.count ?? 0),
    vipCustomers: Number(vipRows[0]?.count ?? 0),
  };
}
