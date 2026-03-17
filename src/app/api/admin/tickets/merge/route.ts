import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { mergeTickets, validateMergeTickets } from "@/lib/db/queries/ticket-merge";
import { prisma } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetTicketId, sourceTicketIds, mergeComment } = body;

    if (!targetTicketId || !sourceTicketIds || !Array.isArray(sourceTicketIds)) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 권한 확인
    const targetTicket = await prisma.ticket.findUnique({
      where: { id: targetTicketId },
    });
    if (!targetTicket) {
      return NextResponse.json({ error: "대상 티켓을 찾을 수 없습니다." }, { status: 404 });
    }

    // 병합 유효성 검사
    const validation = await validateMergeTickets(
      targetTicketId,
      sourceTicketIds
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, conflicts: validation.conflicts },
        { status: 400 }
      );
    }

    // 병합 실행
    const result = await mergeTickets({
      targetTicketId,
      sourceTicketIds,
      mergedBy: session.user.id,
      mergeComment,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Merge tickets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "병합 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const { getMergedTickets } = await import("@/lib/db/queries/ticket-merge");
    const merges = await getMergedTickets(ticketId);

    return NextResponse.json(merges);
  } catch (error) {
    console.error("Get merged tickets error:", error);
    return NextResponse.json(
      { error: "병합 기록을 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
