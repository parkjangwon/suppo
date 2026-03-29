import { createHash } from "node:crypto";

export function buildChatCustomerTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
