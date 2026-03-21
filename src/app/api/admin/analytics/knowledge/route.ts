import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getContributorImpactStats, getKnowledgeROIOverview } from "@/lib/knowledge/analytics";
import { estimateTicketDeflection } from "@/lib/knowledge/deflection";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId") || undefined;
  const periodDays = parseInt(searchParams.get("periodDays") || "30");

  const [contributors, overview, deflection] = await Promise.all([
    getContributorImpactStats(agentId),
    getKnowledgeROIOverview(),
    estimateTicketDeflection(periodDays),
  ]);

  return NextResponse.json({
    contributors,
    overview,
    deflection,
  });
}
