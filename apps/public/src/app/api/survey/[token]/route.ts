import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@suppo/db";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const body = await request.json();
    const { rating, comment } = body;
    const { token } = await params;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: token },
      select: {
        id: true,
        ticketNumber: true,
        customerEmail: true,
        customerId: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // 이미 제출된 설문 확인
    const existing = await prisma.customerSatisfaction.findUnique({
      where: { ticketId: ticket.id },
    });

    if (existing) {
      return NextResponse.json({ error: "Already submitted" }, { status: 400 });
    }

    const survey = await prisma.customerSatisfaction.create({
      data: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        customerId: ticket.customerId,
        customerEmail: ticket.customerEmail,
        rating,
        comment,
      },
    });

    return NextResponse.json({ success: true, survey }, { status: 201 });
  } catch (error) {
    console.error("Failed to submit survey:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
