import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

import { prisma } from "@suppo/db";
import { isRedisAvailable } from "@suppo/shared/cache/redis";
import { getUploadDir } from "@suppo/shared/storage/upload-config";

export const runtime = "nodejs";

type CheckStatus = "healthy" | "unhealthy" | "unknown";

async function checkUploadDirectory(): Promise<CheckStatus> {
  const uploadDir = getUploadDir();
  const probePath = path.join(uploadDir, `.healthcheck-${process.pid}-${Date.now()}`);

  try {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(probePath, "ok", { flag: "wx" });
    await fs.unlink(probePath);
    return "healthy";
  } catch {
    await fs.unlink(probePath).catch(() => {});
    return "unhealthy";
  }
}

export async function GET() {
  const startedAt = Date.now();
  const checks: Record<string, CheckStatus> = {
    database: "unknown",
    uploads: "unknown",
    redis: "unknown",
    emailDispatchToken: process.env.INTERNAL_EMAIL_DISPATCH_TOKEN ? "healthy" : "unknown",
    automationDispatchToken: process.env.INTERNAL_AUTOMATION_DISPATCH_TOKEN ? "healthy" : "unknown",
  };

  let status: "healthy" | "degraded" | "unhealthy" = "healthy";

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "healthy";
  } catch {
    checks.database = "unhealthy";
    status = "unhealthy";
  }

  checks.uploads = await checkUploadDirectory();
  if (checks.uploads === "unhealthy") {
    status = "unhealthy";
  }

  if (process.env.REDIS_URL) {
    try {
      const redisAvailable = await isRedisAvailable();
      checks.redis = redisAvailable ? "healthy" : "unknown";
      if (!redisAvailable) {
        status = status === "unhealthy" ? "unhealthy" : "degraded";
      }
    } catch {
      checks.redis = "unknown";
      status = status === "unhealthy" ? "unhealthy" : "degraded";
    }
  }

  if (checks.emailDispatchToken === "unknown" || checks.automationDispatchToken === "unknown") {
    status = status === "unhealthy" ? "unhealthy" : "degraded";
  }

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      durationMs: Date.now() - startedAt,
      checks,
    },
    { status: status === "unhealthy" ? 503 : 200 }
  );
}
