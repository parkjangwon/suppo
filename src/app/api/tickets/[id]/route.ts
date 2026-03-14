import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminTicketDetail, updateTicketStatus, updateTicketPriority, assignTicket } from "@/lib/db/queries/admin-tickets";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticket = await getAdminTicketDetail(params.id, session.user.agentId, session.user.role as "ADMIN" | "AGENT");

    if (!ticket) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticket = await getAdminTicketDetail(params.id, session.user.agentId, session.user.role as "ADMIN" | "AGENT");

    if (!ticket) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status, priority, assigneeId } = body;

    let updatedTicket: any = ticket;

    if (status) {
      updatedTicket = await updateTicketStatus(params.id, status, session.user.agentId);
    }
    if (priority) {
      updatedTicket = await updateTicketPriority(params.id, priority, session.user.agentId);
    }
    if (assigneeId !== undefined) {
      updatedTicket = await assignTicket(params.id, assigneeId, session.user.agentId);
    }

    return NextResponse.json(updatedTicket);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}



