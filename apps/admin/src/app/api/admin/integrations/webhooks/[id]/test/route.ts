import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { dispatchWebhookEvent } from "@suppo/shared/integrations/outbound-webhooks";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const webhook = await prisma.webhookEndpoint.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      url: true,
    },
  });

  if (!webhook) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const result = await dispatchWebhookEvent(
    "webhook.test",
    {
      source: "admin-test",
      webhookId: webhook.id,
      webhookName: webhook.name,
      webhookUrl: webhook.url,
      testedBy: session.user.email ?? session.user.name ?? "admin",
    },
    {
      endpointId: webhook.id,
      isTest: true,
    },
  );

  return NextResponse.json({ success: true, sent: result.sent });
}
