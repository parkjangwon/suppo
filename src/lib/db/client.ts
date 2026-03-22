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
    // PrismaLibSql은 config 객체 {url, authToken}를 직접 받음.
    // createClient()로 생성한 Client 인스턴스를 전달하면 안 됨 —
    // connect() 시 내부에서 createClient(config)를 재호출하는데 Client.#url이
    // private이라 url이 undefined가 되어 URL_INVALID 오류 발생.
    prismaOptions.adapter = new PrismaLibSql({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
  }

  return new PrismaClient(prismaOptions);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
