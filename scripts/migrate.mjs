/**
 * LibSQL 마이그레이션 러너
 *
 * Prisma 스키마가 provider="sqlite"이므로 prisma migrate deploy는
 * http:// URL을 거부합니다. 이 스크립트는 @libsql/client를 직접 사용해
 * prisma/migrations 의 SQL 파일을 sqld에 적용합니다.
 */

import { createClient } from "@libsql/client";
import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID, createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const client = createClient({ url });

/** sqld가 준비될 때까지 최대 30초 대기 */
async function waitForDatabase(retries = 30, delayMs = 1000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await client.execute("SELECT 1");
      console.log("Database is ready.");
      return;
    } catch {
      console.log(`Waiting for database... (${i}/${retries})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("Database did not become ready in time");
}

const CREATE_MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id"                  TEXT     NOT NULL PRIMARY KEY,
  "checksum"            TEXT     NOT NULL,
  "finished_at"         DATETIME,
  "migration_name"      TEXT     NOT NULL,
  "logs"                TEXT,
  "rolled_back_at"      DATETIME,
  "started_at"          DATETIME NOT NULL DEFAULT current_timestamp,
  "applied_steps_count" INTEGER  NOT NULL DEFAULT 0
)`;

async function main() {
  await waitForDatabase();
  await client.execute(CREATE_MIGRATIONS_TABLE);

  const result = await client.execute(
    `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`
  );
  const applied = new Set(result.rows.map((r) => String(r.migration_name)));

  const migrationsDir = join(__dirname, "..", "prisma", "migrations");
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const migrations = entries
    .filter((e) => e.isDirectory() && /^\d{14}_/.test(e.name))
    .map((e) => e.name)
    .sort();

  let count = 0;
  for (const name of migrations) {
    if (applied.has(name)) {
      console.log(`  skip  ${name}`);
      continue;
    }

    const sqlPath = join(migrationsDir, name, "migration.sql");
    let sql;
    try {
      sql = await readFile(sqlPath, "utf-8");
    } catch {
      console.log(`  skip  ${name} (no migration.sql)`);
      continue;
    }

    const checksum = createHash("sha256").update(sql).digest("hex");
    const id = randomUUID();

    console.log(`  apply ${name}`);

    await client.execute({
      sql: `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, applied_steps_count)
            VALUES (?, ?, ?, datetime('now'), 0)`,
      args: [id, checksum, name],
    });

    try {
      await client.executeMultiple(sql);

      await client.execute({
        sql: `UPDATE "_prisma_migrations"
              SET finished_at = datetime('now'), applied_steps_count = 1
              WHERE id = ?`,
        args: [id],
      });

      console.log(`  done  ${name}`);
      count++;
    } catch (err) {
      await client.execute({
        sql: `UPDATE "_prisma_migrations" SET logs = ?, rolled_back_at = datetime('now') WHERE id = ?`,
        args: [String(err), id],
      });
      throw err;
    }
  }

  if (count === 0) {
    console.log("Database is already up to date.");
  } else {
    console.log(`\nApplied ${count} migration(s) successfully.`);
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
