#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const installIfMissing = process.argv.includes("--install-if-missing");

function readEnvFile(filePath) {
  if (!existsSync(filePath)) return new Map();

  const values = new Map();
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const match = /^([^=]+)=(.*)$/.exec(line);
    if (!match) continue;
    values.set(match[1].trim(), match[2]);
  }
  return values;
}

function writeEnvFile(filePath, values) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const lines = [];
  for (const [key, value] of values) {
    lines.push(`${key}=${value}`);
  }
  writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function upsert(values, key, value, shouldReplace = (current) => !current) {
  const current = values.get(key);
  if (shouldReplace(current)) {
    values.set(key, value);
  }
}

function generatedSecret() {
  return randomBytes(32).toString("base64url");
}

function isPlaceholderSecret(value) {
  return !value || value.startsWith("your-") || value === "change-me-in-production";
}

function ensureRootEnv() {
  const envPath = path.join(rootDir, ".env");
  const values = readEnvFile(envPath);

  upsert(values, "DATABASE_URL", "postgresql://suppo:suppo_dev@localhost:5432/suppo", (current) => {
    return !current || current.startsWith("file:") || current.startsWith("http://") || current.startsWith("https://");
  });
  upsert(values, "POSTGRES_PASSWORD", "suppo_dev", isPlaceholderSecret);
  upsert(values, "AUTH_SECRET", generatedSecret(), isPlaceholderSecret);
  upsert(values, "TICKET_ACCESS_SECRET", generatedSecret(), isPlaceholderSecret);
  upsert(values, "GIT_TOKEN_ENCRYPTION_KEY", generatedSecret(), isPlaceholderSecret);
  upsert(values, "INTERNAL_EMAIL_DISPATCH_TOKEN", generatedSecret(), isPlaceholderSecret);
  upsert(values, "INTERNAL_AUTOMATION_DISPATCH_TOKEN", generatedSecret(), isPlaceholderSecret);
  upsert(values, "AUTH_URL", "http://localhost:3000");
  upsert(values, "PUBLIC_URL", "http://localhost:3000");
  upsert(values, "ADMIN_URL", "http://localhost:3001");
  upsert(values, "ADMIN_BASE_URL", "http://localhost:3001");
  upsert(values, "APP_BASE_URL", "http://localhost:3000");
  upsert(values, "UPLOAD_DIR", "uploads");
  upsert(values, "EMAIL_DOMAIN", "localhost");
  upsert(values, "INITIAL_ADMIN_EMAIL", "admin@suppo.io");
  upsert(values, "INITIAL_ADMIN_PASSWORD", "admin1234");
  upsert(values, "AUTO_BOOTSTRAP", "if-empty");
  upsert(values, "SEED_PROFILE", "demo");

  writeEnvFile(envPath, values);
  return values;
}

function ensureAppEnv(rootValues) {
  const publicEnv = readEnvFile(path.join(rootDir, "apps/public/.env.local"));
  upsert(publicEnv, "DATABASE_URL", rootValues.get("DATABASE_URL"));
  upsert(publicEnv, "TICKET_ACCESS_SECRET", rootValues.get("TICKET_ACCESS_SECRET"));
  upsert(publicEnv, "AUTH_URL", "http://localhost:3000");
  upsert(publicEnv, "PUBLIC_URL", rootValues.get("PUBLIC_URL") || "http://localhost:3000");
  upsert(publicEnv, "ADMIN_URL", rootValues.get("ADMIN_URL") || "http://localhost:3001");
  upsert(publicEnv, "APP_BASE_URL", rootValues.get("APP_BASE_URL") || "http://localhost:3000");
  upsert(publicEnv, "UPLOAD_DIR", rootValues.get("UPLOAD_DIR") || "uploads");
  writeEnvFile(path.join(rootDir, "apps/public/.env.local"), publicEnv);

  const adminEnv = readEnvFile(path.join(rootDir, "apps/admin/.env.local"));
  upsert(adminEnv, "DATABASE_URL", rootValues.get("DATABASE_URL"));
  upsert(adminEnv, "AUTH_SECRET", rootValues.get("AUTH_SECRET"));
  upsert(adminEnv, "TICKET_ACCESS_SECRET", rootValues.get("TICKET_ACCESS_SECRET"));
  upsert(adminEnv, "GIT_TOKEN_ENCRYPTION_KEY", rootValues.get("GIT_TOKEN_ENCRYPTION_KEY"));
  upsert(adminEnv, "INTERNAL_EMAIL_DISPATCH_TOKEN", rootValues.get("INTERNAL_EMAIL_DISPATCH_TOKEN"));
  upsert(adminEnv, "INTERNAL_AUTOMATION_DISPATCH_TOKEN", rootValues.get("INTERNAL_AUTOMATION_DISPATCH_TOKEN"));
  upsert(adminEnv, "INITIAL_ADMIN_EMAIL", rootValues.get("INITIAL_ADMIN_EMAIL") || "admin@suppo.io");
  upsert(adminEnv, "INITIAL_ADMIN_PASSWORD", rootValues.get("INITIAL_ADMIN_PASSWORD") || "admin1234");
  upsert(adminEnv, "AUTH_URL", "http://localhost:3001");
  upsert(adminEnv, "PUBLIC_URL", rootValues.get("PUBLIC_URL") || "http://localhost:3000");
  upsert(adminEnv, "ADMIN_URL", rootValues.get("ADMIN_URL") || "http://localhost:3001");
  upsert(adminEnv, "ADMIN_BASE_URL", rootValues.get("ADMIN_BASE_URL") || "http://localhost:3001");
  upsert(adminEnv, "UPLOAD_DIR", rootValues.get("UPLOAD_DIR") || "uploads");
  writeEnvFile(path.join(rootDir, "apps/admin/.env.local"), adminEnv);
}

function ensureDependencies() {
  if (!installIfMissing || existsSync(path.join(rootDir, "node_modules/.pnpm"))) {
    return;
  }

  execFileSync("pnpm", ["install", "--frozen-lockfile"], {
    cwd: rootDir,
    stdio: "inherit",
  });
}

const rootValues = ensureRootEnv();
ensureAppEnv(rootValues);
ensureDependencies();

console.log("[env] Local Suppo environment is ready.");
