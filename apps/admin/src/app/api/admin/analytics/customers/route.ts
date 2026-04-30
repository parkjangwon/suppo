import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { getRepeatInquiries } from "@/lib/db/queries/admin-analytics/repeat-inquiries";
import { getVIPCustomers } from "@/lib/db/queries/admin-analytics/vip-customers";
import { getDateRangeFromPreset } from "@/lib/db/queries/admin-analytics/filters";
import { db } from "@suppo/db/raw";

const querySchema = z.object({
  preset: z.enum(["7d", "30d", "90d", "custom"]).default("30d"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  segment: z.enum(["repeat", "vip", "top"]).default("repeat"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
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
      segment: searchParams.get("segment") ?? "repeat",
      limit: searchParams.get("limit") ?? "50",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { preset, from, to, segment, limit } = parsed.data;
    
    let dateRange;
    if (preset === "custom" && from && to) {
      dateRange = {
        from: new Date(from),
        to: new Date(to),
      };
    } else {
      dateRange = getDateRangeFromPreset(preset);
    }

    let data;
    switch (segment) {
      case "repeat":
        data = await getRepeatInquiries(dateRange);
        break;
      case "vip":
        data = await getVIPCustomers(dateRange);
        break;
      case "top":
        data = await getTopCustomers(dateRange, limit);
        break;
      default:
        data = await getRepeatInquiries(dateRange);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Customer analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer analytics" },
      { status: 500 }
    );
  }
}

async function getTopCustomers(dateRange: { from: Date; to: Date }, limit: number) {
  const customers = await db.execute({
    sql: `
      SELECT
        "customerId",
        "customerName",
        "customerEmail",
        COUNT(*) as "ticketCount"
      FROM "Ticket"
      WHERE "createdAt" >= $1::timestamptz
        AND "createdAt" <= $2::timestamptz
      GROUP BY "customerId", "customerName", "customerEmail"
      ORDER BY COUNT(*) DESC
      LIMIT $3
    `,
    args: [dateRange.from.toISOString(), dateRange.to.toISOString(), limit],
  });

  const typedCustomers = customers.rows as Array<{
    customerId: string | null;
    customerName: string;
    customerEmail: string;
    ticketCount: bigint;
  }>;

  return {
    customers: typedCustomers.map((c) => ({
      customerId: c.customerId,
      customerName: c.customerName,
      customerEmail: c.customerEmail,
      ticketCount: Number(c.ticketCount),
    })),
  };
}
