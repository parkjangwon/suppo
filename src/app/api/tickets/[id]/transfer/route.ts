import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { transferTicket } from "@/lib/agents/transfer-ticket";
import { getBackofficeSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

const transferSchema = z.object({
  toAgentId: z.string().trim().min(1, "양도 대상 상담원을 선택해주세요"),
  reason: z.string().trim().max(500).optional()
});

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await getBackofficeSession();

  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다", issues: parsed.error.issues }, { status: 400 });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      assigneeId: true
    }
  });

  if (!ticket) {
    return NextResponse.json({ error: "티켓을 찾을 수 없습니다" }, { status: 404 });
  }

  if (session.user.role !== "ADMIN" && ticket.assigneeId !== session.user.agentId) {
    return NextResponse.json({ error: "담당자 또는 관리자 권한이 필요합니다" }, { status: 403 });
  }

  try {
    const result = await transferTicket({
      ticketId: id,
      toAgentId: parsed.data.toAgentId,
      reason: parsed.data.reason,
      actorAgentId: session.user.agentId
    });

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "양도 처리에 실패했습니다";
    const status = message.includes("찾을 수") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
