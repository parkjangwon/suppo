import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { validateWebhookTargetUrl } from "@crinity/shared/security/webhook-url";

const webhookEventSchema = z.enum(["ticket.created", "ticket.updated", "ticket.commented"]);

const updateWebhookSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  secret: z.string().nullable().optional(),
  events: z.array(webhookEventSchema).min(1).optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateWebhookSchema.parse(body);

    if (validated.url) {
      const urlValidation = validateWebhookTargetUrl(validated.url);
      if (!urlValidation.valid) {
        return NextResponse.json({ error: urlValidation.error }, { status: 400 });
      }
    }

    const webhook = await prisma.webhookEndpoint.update({
      where: { id },
      data: validated,
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

    return NextResponse.json(webhook);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Validation error" }, { status: 400 });
    }

    console.error("Failed to update webhook endpoint:", error);
    return NextResponse.json({ error: "Failed to update webhook endpoint" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.webhookEndpoint.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete webhook endpoint:", error);
    return NextResponse.json({ error: "Failed to delete webhook endpoint" }, { status: 500 });
  }
}
