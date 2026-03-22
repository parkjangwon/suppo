import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { validateMergeTickets } from "@/lib/db/queries/ticket-merge";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetTicketId, sourceTicketIds } = body;

    if (!targetTicketId || !sourceTicketIds || !Array.isArray(sourceTicketIds)) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 병합 유효성 검사
    const validation = await validateMergeTickets(
      targetTicketId,
      sourceTicketIds
    );

    return NextResponse.json(validation);
  } catch (error) {
    console.error("Validate merge error:", error);
    return NextResponse.json(
      { error: "검증 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
