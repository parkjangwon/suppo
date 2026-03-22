import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@crinity/db";
import { issueTicketAccessCookie } from "@crinity/shared/security/ticket-access";
import { checkRateLimit, createRateLimitHeaders } from "@crinity/shared/security/rate-limit";
import { validateRequest, lookupTicketSchema } from "@crinity/shared/security/input-validation";

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimitResult = checkRateLimit(ip, 5, 60 * 1000); // 5 requests per minute

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // 콘텐츠 타입 검증
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { error: "Invalid content type. Expected application/json" },
        { status: 415 }
      );
    }

    // 입력 검증
    const body = await request.json();
    const validated = validateRequest(lookupTicketSchema, body);

    // 티켓 조회
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber: validated.ticketNumber },
      select: { customerEmail: true },
    });

    // 사용자 열거 방지 - 이메일 일치 여부만 확인
    if (!ticket || ticket.customerEmail !== validated.email) {
      return NextResponse.json({ success: false }, { status: 200 }); // 존재 여부 감추기
    }

    const token = await issueTicketAccessCookie(validated.ticketNumber, validated.email);

    const response = NextResponse.json(
      { success: true },
      { headers: createRateLimitHeaders(rateLimitResult) }
    );
    response.cookies.set({
      name: "ticket_access",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Ticket lookup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
