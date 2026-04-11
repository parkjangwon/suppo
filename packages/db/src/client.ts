import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./resolve-database-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

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
    const { PrismaLibSQL } = dynamicRequire("@prisma/adapter-libsql") as typeof import("@prisma/adapter-libsql");
    prismaOptions.adapter = new PrismaLibSQL({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN
    });
  } else {
    prismaOptions.datasources = {
      db: {
        url
      }
    };
  }

  return new PrismaClient(prismaOptions);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
