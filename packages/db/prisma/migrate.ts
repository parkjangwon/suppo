import { createClient } from "@libsql/client";
import fs from "node:fs/promises";
import path from "node:path";

const MIGRATIONS_TABLE = "_suppo_migrations";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function quoteSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function listMigrationFiles(): Promise<Array<{ name: string; sql: string }>> {
  const migrationsDir = path.resolve(__dirname, "migrations");
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });

  const migrations = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(async (entry) => {
        const sqlPath = path.join(migrationsDir, entry.name, "migration.sql");
        const sql = await fs.readFile(sqlPath, "utf8");
        return {
          name: entry.name,
          sql,
        };
      }),
  );

  return migrations;
}

async function main() {
  const url = requireEnv("DATABASE_URL");
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  const client = createClient({
    url,
    authToken,
  });

  try {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
        "migration_name" TEXT NOT NULL PRIMARY KEY,
        "applied_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const appliedRows = await client.execute(
      `SELECT "migration_name" FROM "${MIGRATIONS_TABLE}" ORDER BY "migration_name"`,
    );
    const applied = new Set(
      appliedRows.rows.map((row) => String(row.migration_name)),
    );

    const migrations = await listMigrationFiles();

    for (const migration of migrations) {
      if (applied.has(migration.name)) {
        console.log(`- Skipping already applied migration: ${migration.name}`);
        continue;
      }

      console.log(`- Applying migration: ${migration.name}`);
      await client.executeMultiple(`
        BEGIN;
        ${migration.sql}
        INSERT INTO "${MIGRATIONS_TABLE}" ("migration_name")
        VALUES (${quoteSqlString(migration.name)});
        COMMIT;
      `);
    }

    console.log("✅ Migration completed successfully!");
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exitCode = 1;
});
