import { describe, expect, it } from "vitest";

import { validateEnvironment } from "../../scripts/validate-production-env";

const baseEnv = {
  DATABASE_URL: "postgresql://suppo:strong-password@postgres:5432/suppo",
  PUBLIC_URL: "https://help.example.com",
  ADMIN_BASE_URL: "https://admin.example.com",
  APP_BASE_URL: "https://help.example.com",
  AUTH_SECRET: "a".repeat(32),
  TICKET_ACCESS_SECRET: "b".repeat(32),
  GIT_TOKEN_ENCRYPTION_KEY: "c".repeat(32),
  TURNSTILE_SECRET_KEY: "turnstile",
  INTERNAL_EMAIL_DISPATCH_TOKEN: "email-token",
  INTERNAL_AUTOMATION_DISPATCH_TOKEN: "automation-token",
  UPLOAD_DIR: "uploads",
} satisfies NodeJS.ProcessEnv;

function messages(env: NodeJS.ProcessEnv) {
  return validateEnvironment(env, false).map((finding) => finding.message);
}

describe("validateProductionEnvironment", () => {
  it("accepts a minimal hardened production configuration", () => {
    expect(validateEnvironment(baseEnv, false)).toEqual([]);
  });

  it("rejects app-public upload directories", () => {
    expect(messages({
      ...baseEnv,
      UPLOAD_DIR: "apps/public/public/uploads",
    })).toContain("UPLOAD_DIR must point to a shared private directory, not an app public directory");
  });

  it("rejects non-PostgreSQL database URLs", () => {
    expect(messages({
      ...baseEnv,
      DATABASE_URL: "file:./packages/db/dev.db",
    })).toContain("DATABASE_URL must use postgresql:// or postgres:// for production");
  });

  it("rejects reused secret values", () => {
    expect(messages({
      ...baseEnv,
      TICKET_ACCESS_SECRET: baseEnv.AUTH_SECRET,
    })).toContain("AUTH_SECRET and TICKET_ACCESS_SECRET must use different secret values");
  });

  it("warns for weak initial admin passwords and mismatched customer base URLs", () => {
    expect(messages({
      ...baseEnv,
      APP_BASE_URL: "https://wrong.example.com",
      INITIAL_ADMIN_EMAIL: "admin@example.com",
      INITIAL_ADMIN_PASSWORD: "admin1234",
    })).toEqual(expect.arrayContaining([
      "INITIAL_ADMIN_PASSWORD uses a weak default-like value; change it before production",
      "APP_BASE_URL differs from PUBLIC_URL; customer-facing email links may point to the wrong host",
    ]));
  });

  it("accepts ADMIN_URL when ADMIN_BASE_URL is not set", () => {
    const { ADMIN_BASE_URL: _removed, ...env } = baseEnv;

    expect(validateEnvironment({
      ...env,
      ADMIN_URL: "https://admin.example.com",
    }, false).filter((finding) => finding.level === "error")).toEqual([]);
  });

  it("allows missing secrets only when Docker generated secrets are explicitly accepted", () => {
    const {
      AUTH_SECRET: _auth,
      TICKET_ACCESS_SECRET: _ticket,
      GIT_TOKEN_ENCRYPTION_KEY: _git,
      ...env
    } = baseEnv;

    expect(validateEnvironment(env, false).filter((finding) => finding.level === "error").length).toBe(3);
    expect(validateEnvironment(env, false, { allowGeneratedSecrets: true })).toEqual(expect.arrayContaining([
      expect.objectContaining({
        level: "warning",
        message: "AUTH_SECRET is missing; relying on Docker secrets-init to generate it before runtime",
      }),
    ]));
    expect(validateEnvironment(env, false, { allowGeneratedSecrets: true }).filter((finding) => finding.level === "error")).toEqual([]);
  });

  it("accepts Docker Compose env that derives DATABASE_URL from POSTGRES_PASSWORD", () => {
    const {
      DATABASE_URL: _databaseUrl,
      AUTH_SECRET: _auth,
      TICKET_ACCESS_SECRET: _ticket,
      GIT_TOKEN_ENCRYPTION_KEY: _git,
      ...env
    } = baseEnv;

    expect(validateEnvironment({
      ...env,
      POSTGRES_PASSWORD: "production-db-password",
    }, false, { allowGeneratedSecrets: true }).filter((finding) => finding.level === "error")).toEqual([]);
  });

  it("rejects weak Docker Compose PostgreSQL passwords", () => {
    const {
      DATABASE_URL: _databaseUrl,
      AUTH_SECRET: _auth,
      TICKET_ACCESS_SECRET: _ticket,
      GIT_TOKEN_ENCRYPTION_KEY: _git,
      ...env
    } = baseEnv;

    expect(messages({
      ...env,
      POSTGRES_PASSWORD: "change-me-in-production",
    })).toContain("POSTGRES_PASSWORD must be changed from the default placeholder before production");
  });

  it("requires CAPTCHA and OAuth when production launch gates are enabled", () => {
    const {
      TURNSTILE_SECRET_KEY: _turnstile,
      ...env
    } = baseEnv;

    const findings = validateEnvironment(env, false, {
      requireCaptcha: true,
      requireOAuth: true,
    });

    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        level: "error",
        message: "TURNSTILE_SECRET_KEY is required when CAPTCHA is required",
      }),
      expect.objectContaining({
        level: "error",
        message: "AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are required when OAuth is required",
      }),
      expect.objectContaining({
        level: "error",
        message: "AUTH_GITHUB_ID and AUTH_GITHUB_SECRET are required when OAuth is required",
      }),
    ]));
  });
});
