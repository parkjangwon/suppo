import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const dockerfile = readFileSync("docker/Dockerfile", "utf8");
const compose = readFileSync("docker/docker-compose.yml", "utf8");

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
});
