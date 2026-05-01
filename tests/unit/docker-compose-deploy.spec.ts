import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const dockerfile = readFileSync("docker/Dockerfile", "utf8");
const compose = readFileSync("docker/docker-compose.yml", "utf8");
const rootCompose = readFileSync("compose.yaml", "utf8");

describe("Docker Compose one-click deployment", () => {
  it("copies scoped pnpm packages into Next.js standalone output with a merge script", () => {
    expect(dockerfile).toContain("docker/copy-standalone-deps.mjs");
    expect(dockerfile).toContain('RUN node docker/copy-standalone-deps.mjs "$APP_NAME"');
    expect(readFileSync("docker/copy-standalone-deps.mjs", "utf8")).toContain(
      "copySiblingDependencies(packageRealpath)"
    );
  });

  it("generates non-empty secrets without relying on openssl in the secrets-init image", () => {
    expect(compose).toContain("image: node:22-alpine");
    expect(compose).toContain("randomBytes(32).toString(\"base64url\")");
    expect(compose).toContain("required[$$1] = length($$2) > 0");
    expect(compose).toContain('required["INTERNAL_EMAIL_DISPATCH_TOKEN"] = 0');
    expect(compose).toContain('required["INTERNAL_AUTOMATION_DISPATCH_TOKEN"] = 0');
    expect(compose).toContain("INTERNAL_EMAIL_DISPATCH_TOKEN: ${INTERNAL_EMAIL_DISPATCH_TOKEN:-}");
    expect(compose).toContain("INTERNAL_AUTOMATION_DISPATCH_TOKEN: ${INTERNAL_AUTOMATION_DISPATCH_TOKEN:-}");
    expect(compose).not.toContain("openssl rand");
  });

  it("uses admin1234 as the default initial admin password", () => {
    expect(compose).toContain('desiredAdminPassword = "admin1234"');
    expect(compose).toContain('ADMIN_PW="admin1234"');
    expect(compose).not.toContain("rand_password");
  });

  it("uses admin@suppo.io as the default initial admin email", () => {
    expect(compose).toContain("INITIAL_ADMIN_EMAIL: ${INITIAL_ADMIN_EMAIL:-admin@suppo.io}");
    expect(compose).not.toContain("INITIAL_ADMIN_EMAIL: ${INITIAL_ADMIN_EMAIL:-admin@example.com}");
  });

  it("loads demo seed data by default for one-click deployments", () => {
    expect(compose).toContain("SEED_PROFILE: ${SEED_PROFILE:-demo}");
    expect(compose).not.toContain("SEED_PROFILE: ${SEED_PROFILE:-none}");
  });

  it("supports root-level docker compose up without a manual -f flag", () => {
    expect(rootCompose).toContain("include:");
    expect(rootCompose).toContain("docker/docker-compose.yml");
    expect(compose).toContain("POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-suppo_dev}");
    expect(compose).toContain("postgresql://suppo:${POSTGRES_PASSWORD:-suppo_dev}@postgres:5432/suppo");
  });

  it("passes production launch integrations into the runtime containers", () => {
    expect(compose).toContain("NEXT_PUBLIC_TURNSTILE_SITE_KEY: ${NEXT_PUBLIC_TURNSTILE_SITE_KEY:-}");
    expect(compose).toContain("TURNSTILE_SECRET_KEY: ${TURNSTILE_SECRET_KEY:-}");
    expect(compose).toContain("AUTH_GOOGLE_ID: ${AUTH_GOOGLE_ID:-}");
    expect(compose).toContain("AUTH_GOOGLE_SECRET: ${AUTH_GOOGLE_SECRET:-}");
    expect(compose).toContain("AUTH_GITHUB_ID: ${AUTH_GITHUB_ID:-}");
    expect(compose).toContain("AUTH_GITHUB_SECRET: ${AUTH_GITHUB_SECRET:-}");
  });
});
