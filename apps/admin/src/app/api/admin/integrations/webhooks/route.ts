import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@crinity/db";

const webhookEventSchema = z.enum(["ticket.created", "ticket.updated", "ticket.commented"]);

const createWebhookSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  secret: z.string().optional(),
  events: z.array(webhookEventSchema).min(1),
});

export async function GET() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhooks = await prisma.webhookEndpoint.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      url: true,
      secret: true,
      events: true,
      isActive: true,
      lastTriggeredAt: true,
      lastStatusCode: true,
      lastError: true,
      createdAt: true,
    },
  });

  return NextResponse.json(webhooks);
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = createWebhookSchema.parse(body);

    const webhook = await prisma.webhookEndpoint.create({
      data: {
        ...validated,
        createdById: session.user.agentId,
      },
      select: {
        id: true,
        name: true,
        url: true,
        secret: true,
        events: true,
        isActive: true,
        lastTriggeredAt: true,
        lastStatusCode: true,
        lastError: true,
        createdAt: true,
      },
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Validation error" }, { status: 400 });
    }

    console.error("Failed to create webhook endpoint:", error);
    return NextResponse.json({ error: "Failed to create webhook endpoint" }, { status: 500 });
  }
}
