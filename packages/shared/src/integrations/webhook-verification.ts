import crypto from "crypto";

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

export interface WebhookEvent {
  event: string;
  occurredAt: string;
  data: Record<string, unknown>;
}

export function parseWebhookEvent(payload: string): WebhookEvent | null {
  try {
    const parsed = JSON.parse(payload);
    if (!parsed.event || !parsed.occurredAt) {
      return null;
    }
    return parsed as WebhookEvent;
  } catch {
    return null;
  }
}
