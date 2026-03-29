import { NextRequest, NextResponse } from "next/server";

import { executeScheduledAutomationRules } from "@/lib/automation/engine";
import { checkSLABreaches } from "@/lib/sla/engine";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
  const expectedToken = process.env.INTERNAL_AUTOMATION_DISPATCH_TOKEN;
  if (!expectedToken) {
    return false;
  }

  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const internalHeaderToken = request.headers.get("x-internal-token");

  return bearerToken === expectedToken || internalHeaderToken === expectedToken;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await request.json().catch(() => ({}));

    await checkSLABreaches();
    const result = await executeScheduledAutomationRules();

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Failed to dispatch scheduled automation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
