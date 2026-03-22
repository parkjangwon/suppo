import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabaseUrl(): string {
  const configuredUrl = process.env.DATABASE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  const appScopedPath = path.resolve(process.cwd(), "../../packages/db/dev.db");
  if (existsSync(appScopedPath)) {
    return `file:${appScopedPath}`;
  }

  const repoScopedPath = path.resolve(process.cwd(), "packages/db/dev.db");
  return `file:${repoScopedPath}`;
}

function createPrismaClient(): PrismaClient {
  const url = resolveDatabaseUrl();
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  const dynamicRequire = eval("require") as NodeRequire;

  const prismaOptions: ConstructorParameters<typeof PrismaClient>[0] = {
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"]
  };

  const isLibsql = url.startsWith("http://") || url.startsWith("https://");
  if (isLibsql && !isBuildPhase) {
    const { PrismaLibSql } = dynamicRequire("@prisma/adapter-libsql") as typeof import("@prisma/adapter-libsql");
    prismaOptions.adapter = new PrismaLibSql({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN
    });
  }

  return new PrismaClient(prismaOptions);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
