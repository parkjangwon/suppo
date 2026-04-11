import { createHmac } from "node:crypto";

import type { Prisma } from "@prisma/client";
import { prisma } from "@crinity/db";
import { validateWebhookTargetUrl } from "@crinity/shared/security/webhook-url";

export type HelpdeskWebhookEvent =
  | "ticket.created"
  | "ticket.updated"
  | "ticket.commented"
  | "webhook.test";

interface DispatchWebhookOptions {
  endpointId?: string;
  isTest?: boolean;
}

interface WebhookDispatchResult {
  sent: number;
}

function signPayload(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function dispatchWebhookEvent(
  event: HelpdeskWebhookEvent,
  data: Record<string, unknown>,
  options: DispatchWebhookOptions = {}
): Promise<WebhookDispatchResult> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      isActive: true,
    },
  });

  const matchingEndpoints = endpoints.filter((endpoint) => {
    if (options.endpointId && endpoint.id !== options.endpointId) {
      return false;
    }

    if (event === "webhook.test") {
      return true;
    }

    const events = Array.isArray(endpoint.events)
      ? endpoint.events.filter((value): value is string => typeof value === "string")
      : [];
    return events.includes(event);
  });

  let sent = 0;

  for (const endpoint of matchingEndpoints) {
    const requestBody = {
    const urlValidation = validateWebhookTargetUrl(endpoint.url);
      event,
      occurredAt: new Date().toISOString(),
      data,
    };
    const payload = JSON.stringify(requestBody);

    if (!urlValidation.valid) {
      await prisma.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: {
          lastTriggeredAt: new Date(),
          lastStatusCode: null,
          lastError: urlValidation.error,
        },
      });

      await prisma.webhookDeliveryLog.create({
        data: {
          endpointId: endpoint.id,
          event,
          isTest: Boolean(options.isTest),
          requestBody: JSON.parse(payload) as Record<string, unknown>,
          responseStatusCode: null,
          responseBody: null,
          errorMessage: urlValidation.error,
        },
      });

      continue;
    }

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(endpoint.secret
            ? {
                "x-crinity-signature": signPayload(endpoint.secret, payload),
              }
            : {}),
        },
        body: payload,
      });

      await prisma.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: {
          lastTriggeredAt: new Date(),
          lastStatusCode: response.status,
          lastError: response.ok ? null : await response.text(),
        },
      });

      await prisma.webhookDeliveryLog.create({
        data: {
          endpointId: endpoint.id,
          event,
          isTest: Boolean(options.isTest),
          requestBody: toJsonValue(requestBody),
          responseStatusCode: response.status,
          responseBody: response.ok ? null : await response.clone().text(),
          errorMessage: null,
        },
      });

      sent += 1;
    } catch (error) {
      await prisma.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: {
          lastTriggeredAt: new Date(),
          lastStatusCode: null,
          lastError: error instanceof Error ? error.message : "Unknown webhook error",
        },
      });

      await prisma.webhookDeliveryLog.create({
        data: {
          endpointId: endpoint.id,
          event,
          isTest: Boolean(options.isTest),
          requestBody: toJsonValue(requestBody),
          responseStatusCode: null,
          responseBody: null,
          errorMessage: error instanceof Error ? error.message : "Unknown webhook error",
        },
      });
    }
  }

  return { sent };
}
