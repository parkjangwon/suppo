#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const API_ROOT = path.resolve(process.cwd(), "apps/admin/src/app/api");

const PUBLIC_ROUTES = new Set([
  "auth/[...nextauth]",
  "auth/saml/[domain]",
  "branding-assets/[filename]",
  "health",
  "admin/locale",
]);

const API_KEY_ROUTES = new Set([
  "public/tickets",
  "public/tickets/[id]",
]);

const INTERNAL_TOKEN_ROUTES = new Set([
  "internal/automation-dispatch",
  "internal/email-dispatch",
]);

const SIGNED_WEBHOOK_ROUTES = new Set([
  "webhooks/email",
  "webhooks/github",
]);

function classify(route) {
  if (PUBLIC_ROUTES.has(route)) return "public";
  if (API_KEY_ROUTES.has(route)) return "api-key";
  if (INTERNAL_TOKEN_ROUTES.has(route)) return "internal-token";
  if (SIGNED_WEBHOOK_ROUTES.has(route)) return "signed-webhook";
  return "backoffice-session";
}

function expectedGuardDescription(kind) {
  switch (kind) {
    case "public":
      return "explicit public route";
    case "api-key":
      return "authenticatePublicApiKey()";
    case "internal-token":
      return "INTERNAL_*_DISPATCH_TOKEN check";
    case "signed-webhook":
      return "shared secret/signature verification";
    default:
      return "auth() or getBackofficeSession()";
  }
}

function hasExpectedGuard(kind, source) {
  switch (kind) {
    case "public":
      return true;
    case "api-key":
      return source.includes("authenticatePublicApiKey(");
    case "internal-token":
      return /INTERNAL_[A-Z_]+_TOKEN/.test(source) && /authorization|x-internal-token/i.test(source);
    case "signed-webhook":
      return /(SIGNATURE_SECRET|WEBHOOK_SECRET|x-hub-signature|signature)/i.test(source);
    default:
      return /\bauth\s*\(|getBackofficeSession\s*\(/.test(source);
  }
}

async function collectRouteFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectRouteFiles(fullPath));
      continue;
    }

    if (entry.name === "route.ts") {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function routeNameForFile(filePath) {
  return path.relative(API_ROOT, path.dirname(filePath)).split(path.sep).join("/");
}

export async function auditApiAuth() {
  const routeFiles = await collectRouteFiles(API_ROOT);
  const rows = [];

  for (const filePath of routeFiles) {
    const route = routeNameForFile(filePath);
    const kind = classify(route);
    const source = await fs.readFile(filePath, "utf8");
    const ok = hasExpectedGuard(kind, source);

    rows.push({
      route: `/api/${route}`,
      filePath: path.relative(process.cwd(), filePath),
      protection: kind,
      expected: expectedGuardDescription(kind),
      ok,
    });
  }

  return rows;
}

function printRows(rows) {
  console.log("\nAPI Authorization Matrix Audit\n");
  for (const row of rows) {
    const status = row.ok ? "PASS" : "FAIL";
    console.log(`${status} ${row.route} - ${row.protection} (${row.expected})`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const rows = await auditApiAuth();
  printRows(rows);

  const failures = rows.filter((row) => !row.ok);
  if (failures.length > 0) {
    console.log(`\n${failures.length} API route(s) are missing expected authorization guards.`);
    process.exit(1);
  }

  console.log(`\nChecked ${rows.length} API route(s).`);
}
