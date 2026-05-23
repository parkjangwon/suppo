import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@suppo/db";

import {
  authenticatePublicApiKey,
  hasPublicApiScope,
} from "@/lib/public-api/auth";

export async function GET(request: NextRequest) {
  const apiKey = await authenticatePublicApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPublicApiScope(apiKey, "tickets:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ agents });
}
