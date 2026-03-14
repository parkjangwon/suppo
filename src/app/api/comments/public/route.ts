import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { verifyTicketAccessToken } from "@/lib/security/ticket-access";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ticket_access")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await verifyTicketAccessToken(token);
    if (!access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ticketId, content } = await request.json();

    if (!ticketId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { ticketNumber: true, customerEmail: true, customerName: true },
    });

    if (!ticket || ticket.ticketNumber !== access.ticketNumber || ticket.customerEmail !== access.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        ticketId,
        isInternal: false,
        authorType: "CUSTOMER",
        authorName: ticket.customerName,
        authorEmail: ticket.customerEmail,
      },
    });

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error("Public comment creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
