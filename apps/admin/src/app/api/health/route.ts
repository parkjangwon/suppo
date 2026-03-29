import { NextResponse } from "next/server";
import { prisma } from "@crinity/db";
import { isRedisAvailable } from "@crinity/shared/cache/redis";

export async function GET() {
  const checks: Record<string, "healthy" | "unhealthy" | "unknown"> = {
    database: "unknown",
    redis: "unknown",
  };

  let status: "healthy" | "unhealthy" = "healthy";

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "healthy";
  } catch (error) {
    checks.database = "unhealthy";
    status = "unhealthy";
  }

  try {
    const redisAvailable = await isRedisAvailable();
    checks.redis = redisAvailable ? "healthy" : "unhealthy";
    if (!redisAvailable) {
      status = "unhealthy";
    }
  } catch {
    checks.redis = "unhealthy";
    status = "unhealthy";
  }

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: status === "healthy" ? 200 : 503 }
  );
}
