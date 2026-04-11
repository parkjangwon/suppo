#!/usr/bin/env tsx

import { config } from "dotenv";
import path from "node:path";

type ValidationLevel = "error" | "warning";

interface Finding {
  level: ValidationLevel;
  message: string;
}

interface Args {
  envFile?: string;
  allowHttp: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    allowHttp: false,
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
  }

  return args;
}

function loadEnvironment(envFile?: string) {
  const defaultFiles = [".env", ".env.local", "docker/env/.env.production"];
  const files = envFile ? [envFile] : defaultFiles;

  for (const file of files) {
    config({ path: path.resolve(process.cwd(), file), override: false });
  }
}

function requireValue(name: string, findings: Finding[]) {
  const value = process.env[name];
  if (!value) {
    findings.push({ level: "error", message: `${name} is required` });
    return "";
  }

  return value;
}

function requireMinLength(name: string, minLength: number, findings: Finding[]) {
  const value = requireValue(name, findings);
  if (value && value.length < minLength) {
    findings.push({
      level: "error",
      message: `${name} must be at least ${minLength} characters (current: ${value.length})`,
    });
  }
}

function validateUrl(name: string, allowHttp: boolean, findings: Finding[]) {
  const value = requireValue(name, findings);
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
}

function validateEnvironment(allowHttp: boolean) {
  const findings: Finding[] = [];

  requireValue("DATABASE_URL", findings);
  validateUrl("PUBLIC_URL", allowHttp, findings);
  validateUrl("ADMIN_URL", allowHttp, findings);
  requireMinLength("AUTH_SECRET", 32, findings);
  requireMinLength("TICKET_ACCESS_SECRET", 32, findings);
  requireMinLength("GIT_TOKEN_ENCRYPTION_KEY", 32, findings);

  if (!process.env.TURNSTILE_SECRET_KEY) {
    findings.push({
      level: "warning",
      message: "TURNSTILE_SECRET_KEY is missing; public ticket/chat CAPTCHA will fail in production",
    });
  }

  if (!process.env.INTERNAL_EMAIL_DISPATCH_TOKEN) {
    findings.push({
      level: "warning",
      message: "INTERNAL_EMAIL_DISPATCH_TOKEN is missing; email dispatch endpoint cannot be triggered securely",
    });
  }

  if (!process.env.INTERNAL_AUTOMATION_DISPATCH_TOKEN) {
    findings.push({
      level: "warning",
      message: "INTERNAL_AUTOMATION_DISPATCH_TOKEN is missing; automation dispatch endpoint cannot be triggered securely",
    });
  }

  if (process.env.INITIAL_ADMIN_EMAIL && !process.env.INITIAL_ADMIN_PASSWORD) {
    findings.push({
      level: "error",
      message: "INITIAL_ADMIN_PASSWORD must be set when INITIAL_ADMIN_EMAIL is provided",
    });
  }

  if (process.env.INITIAL_ADMIN_PASSWORD && !process.env.INITIAL_ADMIN_EMAIL) {
    findings.push({
      level: "error",
      message: "INITIAL_ADMIN_EMAIL must be set when INITIAL_ADMIN_PASSWORD is provided",
    });
  }

  if (process.env.PUBLIC_URL && process.env.ADMIN_URL && process.env.PUBLIC_URL === process.env.ADMIN_URL) {
    findings.push({
      level: "warning",
      message: "PUBLIC_URL and ADMIN_URL are identical; confirm public/admin domain split is intentional",
    });
  }

  if (process.env.AUTH_SECRET?.includes("test-secret") || process.env.TICKET_ACCESS_SECRET?.includes("test")) {
    findings.push({
      level: "warning",
      message: "Detected test-like secret values; replace before production deployment",
    });
  }

  return findings;
}

function printFindings(findings: Finding[]) {
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

const args = parseArgs(process.argv.slice(2));
loadEnvironment(args.envFile);

const findings = validateEnvironment(args.allowHttp);
printFindings(findings);

if (findings.some((finding) => finding.level === "error")) {
  process.exit(1);
}
