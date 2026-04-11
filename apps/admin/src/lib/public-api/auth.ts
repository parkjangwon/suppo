import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@crinity/db";
import type { NextRequest } from "next/server";

export const PUBLIC_API_SCOPES = ["tickets:read", "tickets:create", "tickets:update"] as const;
export type PublicApiScope = (typeof PUBLIC_API_SCOPES)[number];
export const DEFAULT_PUBLIC_API_KEY_SCOPES: PublicApiScope[] = ["tickets:read", "tickets:create"];

function hashApiKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function extractApiKey(request: NextRequest) {
  const headerKey = request.headers.get("x-api-key");
  if (headerKey) {
    return headerKey;
  }

  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return bearerToken || null;
}

export function normalizePublicApiKeyScopes(scopes: unknown): PublicApiScope[] {
  if (!Array.isArray(scopes)) {
    return [...DEFAULT_PUBLIC_API_KEY_SCOPES];
  }

  const normalized = scopes.filter((scope): scope is PublicApiScope =>
    typeof scope === "string" && PUBLIC_API_SCOPES.includes(scope as PublicApiScope)
  );

  return normalized.length > 0 ? normalized : [...DEFAULT_PUBLIC_API_KEY_SCOPES];
}

export function hasPublicApiScope(
  apiKey: { scopes?: unknown },
  scope: PublicApiScope
) {
  return normalizePublicApiKeyScopes(apiKey.scopes).includes(scope);
}

export async function authenticatePublicApiKey(request: NextRequest) {
  const rawKey = extractApiKey(request);
  if (!rawKey) {
    return null;
  }

  const keyHash = hashApiKey(rawKey);
  const apiKey = await prisma.publicApiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey || !apiKey.isActive) {
    return null;
  }

  await prisma.publicApiKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsedAt: new Date(),
    },
  });

  return {
    ...apiKey,
    scopes: normalizePublicApiKeyScopes(apiKey.scopes),
  };
}

export async function createPublicApiKey(
  name: string,
  createdById: string,
  scopes: PublicApiScope[] = DEFAULT_PUBLIC_API_KEY_SCOPES
) {
  const normalizedScopes = normalizePublicApiKeyScopes(scopes);
  const rawKey = `crn_live_${randomBytes(24).toString("hex")}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 16);

  const apiKey = await prisma.publicApiKey.create({
    data: {
      name,
      keyHash,
      keyPrefix,
      scopes: normalizedScopes,
      createdById,
    },
  });

  return {
    apiKey,
    plaintextKey: rawKey,
  };
}
