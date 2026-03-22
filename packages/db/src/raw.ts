import { prisma } from "./client";
import { resolveDatabaseUrl } from "./resolve-database-url";

type LibsqlClient = {
  execute: (sql: string, args?: any[]) => Promise<{ rows: unknown[] }>;
};

const globalForLibsql = globalThis as unknown as {
  libsql: LibsqlClient | null | undefined;
};

function createLibsqlClient() {
  const url = resolveDatabaseUrl();
  const dynamicRequire = eval("require") as NodeRequire;

  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const isLibsql = url.startsWith("http://") || url.startsWith("https://");
  if (!isLibsql || process.env.NEXT_PHASE === "phase-production-build") {
    return null;
  }

  const { createClient } = dynamicRequire("@libsql/client") as typeof import("@libsql/client");

  return createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN
  });
}

const libsqlClient = globalForLibsql.libsql ?? createLibsqlClient();

if (process.env.NODE_ENV !== "production") {
  globalForLibsql.libsql = libsqlClient;
}

export const db = {
  async execute<T = unknown>(query: { sql: string; args: any[] }): Promise<{ rows: T[] }> {
    if (libsqlClient) {
      const result = await libsqlClient.execute(query.sql, query.args);
      return { rows: result.rows as T[] };
    }

    const result = await prisma.$queryRawUnsafe<T[]>(query.sql, ...query.args);
    return { rows: result as T[] };
  }
};

export const libsql = libsqlClient;
