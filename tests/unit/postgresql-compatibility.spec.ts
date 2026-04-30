import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PostgreSQL compatibility", () => {
  it("does not leave SQLite-only SQL in the analytics overview route", () => {
    const source = readFileSync("apps/admin/src/app/api/admin/analytics/overview/route.ts", "utf8");

    expect(source).not.toContain("julianday(");
    expect(source).not.toContain("FROM Ticket");
    expect(source).not.toMatch(/[<>=]\s*\?/);
    expect(source).toContain('FROM "Ticket"');
    expect(source).toContain("EXTRACT(EPOCH FROM");
    expect(source).toContain("$1::timestamptz");
  });

  it("does not leave SQLite placeholder SQL in customer analytics routes", () => {
    const source = readFileSync("apps/admin/src/app/api/admin/analytics/customers/route.ts", "utf8");

    expect(source).not.toContain("FROM Ticket");
    expect(source).not.toMatch(/[<>=]\s*\?/);
    expect(source).toContain('FROM "Ticket"');
    expect(source).toContain("$1::timestamptz");
  });

  it("does not ship PostgreSQL-to-SQLite migration tooling in the runtime scripts", () => {
    const scripts = readFileSync("package.json", "utf8") +
      readFileSync("scripts/validate-env.ts", "utf8") +
      readFileSync("install.sh", "utf8") +
      readFileSync("playwright.config.ts", "utf8") +
      readFileSync("tests/e2e/fixtures/db.ts", "utf8");

    expect(scripts).not.toContain("SQLite file path or LibSQL URL");
    expect(scripts).not.toContain("migrate-pg-to-sqlite");
    expect(scripts).not.toContain("sqlite3");
    expect(scripts).not.toContain("dev.db");
  });

  it("keeps fresh database schema optimized for PostgreSQL array tag searches", () => {
    const schema = readFileSync("packages/db/prisma/schema.prisma", "utf8");

    expect(schema).toContain("tags                 String[]");
    expect(schema).toContain("tags           String[]");
    expect(schema).toContain("@@index([tags], type: Gin)");
  });
});
