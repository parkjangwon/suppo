import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@crinity/db";
import type { NextRequest } from "next/server";

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

  return apiKey;
}

export async function createPublicApiKey(name: string, createdById: string) {
  const rawKey = `crn_live_${randomBytes(24).toString("hex")}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 16);

  const apiKey = await prisma.publicApiKey.create({
    data: {
      name,
      keyHash,
      keyPrefix,
      createdById,
    },
  });

  return {
    apiKey,
    plaintextKey: rawKey,
  };
}
