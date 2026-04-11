import { NextResponse } from "next/server";
import { prisma } from "@crinity/db";
import { isRedisAvailable } from "@crinity/shared/cache/redis";

export async function GET() {
  const checks: Record<string, "healthy" | "unhealthy" | "unknown"> = {
    database: "unknown",
    redis: "unknown",
  };

  let status: "healthy" | "degraded" | "unhealthy" = "healthy";

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "healthy";
  } catch (error) {
    checks.database = "unhealthy";
    status = "unhealthy";
  }

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

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: status === "unhealthy" ? 503 : 200 }
  );
}
