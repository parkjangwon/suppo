import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { issueTicketAccessCookie } from "@/lib/security/ticket-access";

export async function POST(request: Request) {
  try {
    const { ticketNumber, email } = await request.json();

    if (!ticketNumber || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      select: { customerEmail: true },
    });

    if (!ticket || ticket.customerEmail !== email) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const token = await issueTicketAccessCookie(ticketNumber, email);

    const response = NextResponse.json({ success: true });
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
