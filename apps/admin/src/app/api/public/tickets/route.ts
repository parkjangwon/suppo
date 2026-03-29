import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@crinity/db";
import { createTicket } from "@crinity/shared/tickets/create-ticket";
import { dispatchWebhookEvent } from "@crinity/shared/integrations/outbound-webhooks";

import { authenticatePublicApiKey } from "@/lib/public-api/auth";

const createPublicTicketSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  customerOrganization: z.string().optional(),
  requestTypeId: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  subject: z.string().min(1),
  description: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const apiKey = await authenticatePublicApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? "20");

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      status: true,
      priority: true,
      customerName: true,
      customerEmail: true,
      assigneeId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    apiKey: apiKey.name,
    tickets,
  });
}

export async function POST(request: NextRequest) {
  const apiKey = await authenticatePublicApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = createPublicTicketSchema.parse(body);

    const result = await createTicket(validated);

    await dispatchWebhookEvent("ticket.created", {
      source: "public-api",
      apiKeyId: apiKey.id,
      ticketId: result.ticket.id,
      ticketNumber: result.ticket.ticketNumber,
      subject: result.ticket.subject,
      priority: result.ticket.priority,
      status: result.ticket.status,
    });

    return NextResponse.json(
      {
        id: result.ticket.id,
        ticketNumber: result.ticket.ticketNumber,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    console.error("Failed to create ticket from public api:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
