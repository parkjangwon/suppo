import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { getAgentPerformance } from "@/lib/db/queries/admin-analytics/agents";
import { getDateRangeFromPreset } from "@/lib/db/queries/admin-analytics/filters";

const querySchema = z.object({
  preset: z.enum(["7d", "30d", "90d", "custom"]).default("30d"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  includeInactive: z.coerce.boolean().default(false),
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
      includeInactive: searchParams.get("includeInactive") ?? "false",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { preset, from, to, includeInactive } = parsed.data;
    
    let dateRange;
    if (preset === "custom" && from && to) {
      dateRange = {
        from: new Date(from),
        to: new Date(to),
      };
    } else {
      dateRange = getDateRangeFromPreset(preset);
    }

    const data = await getAgentPerformance(dateRange, includeInactive);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Agent analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent analytics" },
      { status: 500 }
    );
  }
}
