import { prisma } from "./client";

export const db = {
  async execute<T = unknown>(query: { sql: string; args: unknown[] }): Promise<{ rows: T[] }> {
    const result = await prisma.$queryRawUnsafe<T[]>(query.sql, ...query.args);
    return { rows: result };
  },
};
