#!/usr/bin/env tsx

import { config } from "dotenv";
import path from "node:path";
import { pathToFileURL } from "node:url";

type ValidationLevel = "error" | "warning";

export interface Finding {
  level: ValidationLevel;
  message: string;
}

interface Args {
  envFile?: string;
  allowHttp: boolean;
  allowGeneratedSecrets: boolean;
  requireCaptcha: boolean;
  requireOAuth: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    allowHttp: false,
    allowGeneratedSecrets: false,
    requireCaptcha: false,
    requireOAuth: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--env-file") {
      args.envFile = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--allow-http") {
      args.allowHttp = true;
    }

    if (arg === "--allow-generated-secrets") {
      args.allowGeneratedSecrets = true;
    }

    if (arg === "--require-captcha") {
      args.requireCaptcha = true;
    }

    if (arg === "--require-oauth") {
      args.requireOAuth = true;
    }
  }

  return args;
}

function loadEnvironment(envFile?: string) {
  const defaultFiles = [".env", ".env.local", "docker/.env", "docker/env/.env.production"];
  const files = envFile ? [envFile] : defaultFiles;

  for (const file of files) {
    config({ path: path.resolve(process.cwd(), file), override: false });
  }
}

type Environment = NodeJS.ProcessEnv;

function readEnv(env: Environment, name: string) {
  const value = env[name]?.trim();
  return value || undefined;
}

function requireValue(env: Environment, name: string, findings: Finding[]) {
  const value = readEnv(env, name);
  if (!value) {
    findings.push({ level: "error", message: `${name} is required` });
    return "";
  }

  return value;
}

function validatePostgresPassword(env: Environment, findings: Finding[]) {
  const value = readEnv(env, "POSTGRES_PASSWORD");
  if (!value) {
    return;
  }

  if (value === "suppo_dev" || /change-me/i.test(value)) {
    findings.push({
      level: "error",
      message: "POSTGRES_PASSWORD must be changed from the default placeholder before production",
    });
    return;
  }

  if (value.length < 16) {
    findings.push({
      level: "error",
      message: `POSTGRES_PASSWORD must be at least 16 characters (current: ${value.length})`,
    });
  }
}

function effectiveDatabaseUrl(env: Environment) {
  const value = readEnv(env, "DATABASE_URL");
  if (value) {
    return value;
  }

  const postgresPassword = readEnv(env, "POSTGRES_PASSWORD");
  if (postgresPassword) {
    return `postgresql://suppo:${encodeURIComponent(postgresPassword)}@postgres:5432/suppo`;
  }

  return undefined;
}

function validatePostgresDatabaseUrl(env: Environment, findings: Finding[]) {
  const value = effectiveDatabaseUrl(env);
  if (!value) {
    findings.push({ level: "error", message: "DATABASE_URL or POSTGRES_PASSWORD is required" });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    findings.push({ level: "error", message: "DATABASE_URL must be a valid URL" });
    return;
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    findings.push({
      level: "error",
      message: "DATABASE_URL must use postgresql:// or postgres:// for production",
    });
  }
}

function requireMinLength(env: Environment, name: string, minLength: number, findings: Finding[]) {
  const value = requireValue(env, name, findings);
  if (value && value.length < minLength) {
    findings.push({
      level: "error",
      message: `${name} must be at least ${minLength} characters (current: ${value.length})`,
    });
  }
}

function requireSecretMinLength(
  env: Environment,
  name: string,
  minLength: number,
  findings: Finding[],
  allowGeneratedSecrets: boolean,
) {
  const value = readEnv(env, name);
  if (!value && allowGeneratedSecrets) {
    findings.push({
      level: "warning",
      message: `${name} is missing; relying on Docker secrets-init to generate it before runtime`,
    });
    return;
  }

  requireMinLength(env, name, minLength, findings);
}

function validateUrl(env: Environment, name: string, allowHttp: boolean, findings: Finding[]) {
  const value = requireValue(env, name, findings);
  if (!value) {
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    findings.push({ level: "error", message: `${name} must be a valid URL` });
    return;
  }

  if (!allowHttp && parsed.protocol !== "https:") {
    findings.push({ level: "error", message: `${name} must use https in production` });
  }

  if (allowHttp && !["http:", "https:"].includes(parsed.protocol)) {
    findings.push({ level: "error", message: `${name} must use http or https` });
  }
  return parsed;
}

function validateUploadDir(env: Environment, findings: Finding[]) {
  const uploadDir = readEnv(env, "UPLOAD_DIR") ?? "uploads";
  const normalized = uploadDir.replace(/\\/g, "/");

  if (normalized.includes("..")) {
    findings.push({
      level: "error",
      message: "UPLOAD_DIR must not contain path traversal segments",
    });
  }

  if (/apps\/(admin|public)\/public(\/|$)/.test(normalized) || /(^|\/)public\/uploads(\/|$)/.test(normalized)) {
    findings.push({
      level: "error",
      message: "UPLOAD_DIR must point to a shared private directory, not an app public directory",
    });
  }
}

function validateDistinctSecrets(env: Environment, names: string[], findings: Finding[]) {
  for (let left = 0; left < names.length; left += 1) {
    for (let right = left + 1; right < names.length; right += 1) {
      const leftValue = readEnv(env, names[left]);
      const rightValue = readEnv(env, names[right]);
      if (leftValue && rightValue && leftValue === rightValue) {
        findings.push({
          level: "error",
          message: `${names[left]} and ${names[right]} must use different secret values`,
        });
      }
    }
  }
}

function validateWeakValues(env: Environment, findings: Finding[]) {
  const weakAdminPasswords = new Set(["admin", "admin123", "admin1234", "password", "password1234"]);
  const initialPassword = readEnv(env, "INITIAL_ADMIN_PASSWORD");
  if (initialPassword && weakAdminPasswords.has(initialPassword.toLowerCase())) {
    findings.push({
      level: "warning",
      message: "INITIAL_ADMIN_PASSWORD uses a weak default-like value; change it before production",
    });
  }
  if (initialPassword && /change-me|placeholder/i.test(initialPassword)) {
    findings.push({
      level: "warning",
      message: "INITIAL_ADMIN_PASSWORD looks like a placeholder; change it before production",
    });
  }

  for (const name of ["AUTH_SECRET", "TICKET_ACCESS_SECRET", "GIT_TOKEN_ENCRYPTION_KEY"]) {
    const value = readEnv(env, name);
    if (value && /(test|placeholder|changeme|secret-min-32|local-dev)/i.test(value)) {
      findings.push({
        level: "warning",
        message: `${name} looks like a placeholder or test value; replace before production deployment`,
      });
    }
  }
}

function validateCaptcha(env: Environment, findings: Finding[], requireCaptcha: boolean) {
  const siteKey = readEnv(env, "NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  const secretKey = readEnv(env, "TURNSTILE_SECRET_KEY");

  if (requireCaptcha) {
    if (!siteKey) {
      findings.push({
        level: "error",
        message: "NEXT_PUBLIC_TURNSTILE_SITE_KEY is required when CAPTCHA is required",
      });
    }
    if (!secretKey) {
      findings.push({
        level: "error",
        message: "TURNSTILE_SECRET_KEY is required when CAPTCHA is required",
      });
    }
    return;
  }

  if (!secretKey) {
    findings.push({
      level: "warning",
      message: "TURNSTILE_SECRET_KEY is missing; public ticket/chat CAPTCHA will fail in production",
    });
  }
}

function validateOAuth(env: Environment, findings: Finding[], requireOAuth: boolean) {
  const googleId = readEnv(env, "AUTH_GOOGLE_ID");
  const googleSecret = readEnv(env, "AUTH_GOOGLE_SECRET");
  const githubId = readEnv(env, "AUTH_GITHUB_ID");
  const githubSecret = readEnv(env, "AUTH_GITHUB_SECRET");

  if (googleId && !googleSecret) {
    findings.push({ level: "error", message: "AUTH_GOOGLE_SECRET is required when AUTH_GOOGLE_ID is set" });
  }
  if (!googleId && googleSecret) {
    findings.push({ level: "error", message: "AUTH_GOOGLE_ID is required when AUTH_GOOGLE_SECRET is set" });
  }
  if (githubId && !githubSecret) {
    findings.push({ level: "error", message: "AUTH_GITHUB_SECRET is required when AUTH_GITHUB_ID is set" });
  }
  if (!githubId && githubSecret) {
    findings.push({ level: "error", message: "AUTH_GITHUB_ID is required when AUTH_GITHUB_SECRET is set" });
  }

  if (!requireOAuth) {
    return;
  }

  if (!googleId || !googleSecret) {
    findings.push({
      level: "error",
      message: "AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are required when OAuth is required",
    });
  }
  if (!githubId || !githubSecret) {
    findings.push({
      level: "error",
      message: "AUTH_GITHUB_ID and AUTH_GITHUB_SECRET are required when OAuth is required",
    });
  }
}

export function validateEnvironment(
  env: Environment,
  allowHttp: boolean,
  options: { allowGeneratedSecrets?: boolean; requireCaptcha?: boolean; requireOAuth?: boolean } = {},
) {
  const findings: Finding[] = [];

  validatePostgresPassword(env, findings);
  validatePostgresDatabaseUrl(env, findings);
  const publicUrl = validateUrl(env, "PUBLIC_URL", allowHttp, findings);
  const adminBaseUrl = readEnv(env, "ADMIN_BASE_URL") ? validateUrl(env, "ADMIN_BASE_URL", allowHttp, findings) : undefined;
  const adminUrl = readEnv(env, "ADMIN_URL") ? validateUrl(env, "ADMIN_URL", allowHttp, findings) : undefined;

  if (!adminBaseUrl && !adminUrl) {
    findings.push({ level: "error", message: "ADMIN_BASE_URL or ADMIN_URL is required" });
  }

  const allowGeneratedSecrets = options.allowGeneratedSecrets ?? false;
  requireSecretMinLength(env, "AUTH_SECRET", 32, findings, allowGeneratedSecrets);
  requireSecretMinLength(env, "TICKET_ACCESS_SECRET", 32, findings, allowGeneratedSecrets);
  requireSecretMinLength(env, "GIT_TOKEN_ENCRYPTION_KEY", 32, findings, allowGeneratedSecrets);
  validateDistinctSecrets(env, ["AUTH_SECRET", "TICKET_ACCESS_SECRET", "GIT_TOKEN_ENCRYPTION_KEY"], findings);
  validateUploadDir(env, findings);
  validateWeakValues(env, findings);

  validateCaptcha(env, findings, options.requireCaptcha ?? false);
  validateOAuth(env, findings, options.requireOAuth ?? false);

  if (!readEnv(env, "INTERNAL_EMAIL_DISPATCH_TOKEN")) {
    findings.push({
      level: "warning",
      message: "INTERNAL_EMAIL_DISPATCH_TOKEN is missing; email dispatch endpoint cannot be triggered securely",
    });
  }

  if (!readEnv(env, "INTERNAL_AUTOMATION_DISPATCH_TOKEN")) {
    findings.push({
      level: "warning",
      message: "INTERNAL_AUTOMATION_DISPATCH_TOKEN is missing; automation dispatch endpoint cannot be triggered securely",
    });
  }

  if (readEnv(env, "INITIAL_ADMIN_EMAIL") && !readEnv(env, "INITIAL_ADMIN_PASSWORD")) {
    findings.push({
      level: "error",
      message: "INITIAL_ADMIN_PASSWORD must be set when INITIAL_ADMIN_EMAIL is provided",
    });
  }

  if (readEnv(env, "INITIAL_ADMIN_PASSWORD") && !readEnv(env, "INITIAL_ADMIN_EMAIL")) {
    findings.push({
      level: "error",
      message: "INITIAL_ADMIN_EMAIL must be set when INITIAL_ADMIN_PASSWORD is provided",
    });
  }

  const effectiveAdminUrl = adminBaseUrl ?? adminUrl;
  if (publicUrl && effectiveAdminUrl && publicUrl.href === effectiveAdminUrl.href) {
    findings.push({
      level: "warning",
      message: "PUBLIC_URL and admin URL are identical; confirm public/admin domain split is intentional",
    });
  }

  const appBaseUrl = readEnv(env, "APP_BASE_URL");
  if (appBaseUrl && publicUrl) {
    try {
      const parsedAppBaseUrl = new URL(appBaseUrl);
      if (parsedAppBaseUrl.href !== publicUrl.href) {
        findings.push({
          level: "warning",
          message: "APP_BASE_URL differs from PUBLIC_URL; customer-facing email links may point to the wrong host",
        });
      }
    } catch {
      findings.push({ level: "error", message: "APP_BASE_URL must be a valid URL when set" });
    }
  }

  const bindIp = readEnv(env, "BIND_IP");
  if (bindIp === "0.0.0.0" || bindIp === "::") {
    findings.push({
      level: "warning",
      message: "BIND_IP exposes app ports on all interfaces; use 127.0.0.1 behind a reverse proxy when possible",
    });
  }

  return findings;
}

export function printFindings(findings: Finding[]) {
  const errors = findings.filter((finding) => finding.level === "error");
  const warnings = findings.filter((finding) => finding.level === "warning");

  console.log("\nOperational Environment Validation\n");

  if (errors.length === 0 && warnings.length === 0) {
    console.log("PASS: no issues found");
    return;
  }

  if (errors.length > 0) {
    console.log("Errors:");
    for (const error of errors) {
      console.log(`- ${error.message}`);
    }
    console.log("");
  }

  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning.message}`);
    }
    console.log("");
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvironment(args.envFile);

  const findings = validateEnvironment(process.env, args.allowHttp, {
    allowGeneratedSecrets: args.allowGeneratedSecrets,
    requireCaptcha: args.requireCaptcha,
    requireOAuth: args.requireOAuth,
  });
  printFindings(findings);

  if (findings.some((finding) => finding.level === "error")) {
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
