import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // LibSQL (http:// or https://) uses LibSQL adapter
  // SQLite (file:) uses default adapter
  const isLibsql = url.startsWith("http://") || url.startsWith("https://");

  const prismaOptions: import("@prisma/client").PrismaClientOptions = {
    log: process.env.NODE_ENV === "development"
      ? ["query", "warn", "error"]
      : ["error"],
  };

  // Next.js 빌드 단계(phase-production-build)에서는 LibSQL 연결을 맺지 않음.
  // 페이지 데이터 수집 시 libsql이 sqld에 연결 시도하면 내부 "URL undefined" 오류 발생.
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

  if (isLibsql && !isBuildPhase) {
    const libsql = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    prismaOptions.adapter = new PrismaLibSql(libsql);
  }

  return new PrismaClient(prismaOptions);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
