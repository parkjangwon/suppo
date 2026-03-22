import { createClient } from "@libsql/client";
import { prisma } from "./client";

const globalForLibsql = globalThis as unknown as {
  libsql: ReturnType<typeof createClient> | undefined;
};

function createLibsqlClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const isLibsql = url.startsWith("http://") || url.startsWith("https://");

  if (!isLibsql) {
    return null;
  }

  // Next.js 빌드 단계에서는 연결하지 않음 (sqld 없는 환경에서 libsql 내부 오류 방지)
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return null;
  }

  return createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
}

const libsqlClient = globalForLibsql.libsql ?? createLibsqlClient();

if (process.env.NODE_ENV !== "production") {
  globalForLibsql.libsql = libsqlClient;
}

/**
 * Unified raw query interface that works with both SQLite (via Prisma) and LibSQL.
 */
export const db = {
  async execute<T = any>(query: { sql: string; args: any[] }): Promise<{ rows: T[] }> {
    if (libsqlClient) {
      // LibSQL mode
      const result = await libsqlClient.execute(query.sql, query.args);
      return { rows: result.rows as T[] };
    } else {
      // SQLite mode via Prisma
      const result = await prisma.$queryRawUnsafe<T[]>(query.sql, ...query.args);
      return { rows: result as T[] };
    }
  },
};

/**
 * Direct LibSQL client (only available in LibSQL mode).
 * Use `db.execute()` instead for cross-database compatibility.
 */
export const libsql = libsqlClient;
