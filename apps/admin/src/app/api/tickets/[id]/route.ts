import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminTicketDetail, updateTicketStatus, updateTicketPriority, assignTicket } from "@/lib/db/queries/admin-tickets";
import { validateRequest, updateTicketSchema } from "@crinity/shared/security/input-validation";
import { requireJson } from "@crinity/shared/security/content-type";
import { checkRateLimit, createRateLimitHeaders } from "@crinity/shared/security/rate-limit";
import { dispatchWebhookEvent } from "@crinity/shared/integrations/outbound-webhooks";
import { prisma } from "@crinity/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // ID 형식 검증
    if (!id || id.length > 100) {
      return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 });
    }

    const ticket = await getAdminTicketDetail(id, session.user.agentId, session.user.role as "ADMIN" | "AGENT");

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // ID 형식 검증
    if (!id || id.length > 100) {
      return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 });
    }

    // 콘텐츠 타입 검증
    const contentTypeError = requireJson(request);
    if (contentTypeError) {
      return contentTypeError;
    }

    // Rate Limiting
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimitResult = checkRateLimit(ip, 20, 60 * 1000); // 20 requests per minute

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const ticket = await getAdminTicketDetail(id, session.user.agentId, session.user.role as "ADMIN" | "AGENT");

    if (!ticket) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = validateRequest(updateTicketSchema, body);

    let updatedTicket: any = ticket;

    if (validated.status) {
      updatedTicket = await updateTicketStatus(id, validated.status, session.user.agentId);
    }
    if (validated.priority) {
      updatedTicket = await updateTicketPriority(id, validated.priority, session.user.agentId);
    }
    if (validated.assigneeId !== undefined) {
      updatedTicket = await assignTicket(id, validated.assigneeId, session.user.agentId);
    }

    if (validated.status || validated.priority || validated.assigneeId !== undefined) {
      await dispatchWebhookEvent("ticket.updated", {
        source: "admin-panel",
        actorId: session.user.agentId,
        ticketId: id,
        ticketNumber: ticket.ticketNumber,
        changes: {
          ...(validated.status ? { status: validated.status } : {}),
          ...(validated.priority ? { priority: validated.priority } : {}),
          ...(validated.assigneeId !== undefined ? { assigneeId: validated.assigneeId } : {}),
        },
      });
    }

    return NextResponse.json(updatedTicket, { headers: createRateLimitHeaders(rateLimitResult) });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
