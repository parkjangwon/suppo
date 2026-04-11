import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@crinity/db";
import { dispatchWebhookEvent } from "@crinity/shared/integrations/outbound-webhooks";

import {
  authenticatePublicApiKey,
  hasPublicApiScope,
} from "@/lib/public-api/auth";
import {
  assignTicket,
  updateTicketPriority,
  updateTicketStatus,
} from "@/lib/db/queries/admin-tickets";

const updatePublicTicketSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().nullable().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const apiKey = await authenticatePublicApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPublicApiScope(apiKey, "tickets:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      description: true,
      status: true,
      priority: true,
      assigneeId: true,
      customerName: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json(ticket);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const apiKey = await authenticatePublicApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPublicApiScope(apiKey, "tickets:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        priority: true,
        assigneeId: true,
      },
    });

    if (!existingTicket) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = updatePublicTicketSchema.parse(body);
    let updatedTicket = existingTicket as Record<string, unknown>;

    if (validated.status) {
      updatedTicket = (await updateTicketStatus(id, validated.status, null, "SYSTEM")) as Record<string, unknown>;
    }
    if (validated.priority) {
      updatedTicket = (await updateTicketPriority(id, validated.priority, null, "SYSTEM")) as Record<string, unknown>;
    }
    if (validated.assigneeId !== undefined) {
      updatedTicket = (await assignTicket(id, validated.assigneeId, null, "SYSTEM")) as Record<string, unknown>;
    }

    await dispatchWebhookEvent("ticket.updated", {
      source: "public-api",
      apiKeyId: apiKey.id,
      ticketId: id,
      ticketNumber: existingTicket.ticketNumber,
      changes: validated,
    });

    return NextResponse.json(updatedTicket);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    console.error("Failed to update ticket from public api:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
