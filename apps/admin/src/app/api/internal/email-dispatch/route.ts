import { NextRequest, NextResponse } from "next/server";

import { processOutbox } from "@crinity/shared/email/process-outbox";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
  const expectedToken = process.env.INTERNAL_EMAIL_DISPATCH_TOKEN;
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
    const requestBody = (await request.json().catch(() => ({}))) as {
      limit?: number;
    };

    const limit =
      typeof requestBody.limit === "number" && Number.isFinite(requestBody.limit)
        ? Math.max(1, Math.min(100, Math.trunc(requestBody.limit)))
        : 25;

    const result = await processOutbox({ limit });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Failed to dispatch email outbox:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
