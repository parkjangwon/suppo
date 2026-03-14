import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { deactivateAgent } from "@/lib/agents/deactivate-agent";
import { getBackofficeSession } from "@/lib/auth/session";

const deactivateSchema = z.object({
  reason: z.string().trim().max(500).optional()
});

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

function isAdminSession(role: string | undefined): boolean {
  return role === "ADMIN";
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const session = await getBackofficeSession();
  if (!session || !isAdminSession(session.user.role)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
  }

  if (session.user.agentId === id) {
    return NextResponse.json({ error: "본인 계정은 비활성화할 수 없습니다" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = deactivateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await deactivateAgent(
      id,
      {
        actorAgentId: session.user.agentId,
        reason: parsed.data.reason
      }
    );

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "비활성화에 실패했습니다";
    const status = message.includes("찾을 수") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
