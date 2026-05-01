import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("OAuth login readiness", () => {
  it("defines the Auth.js Prisma adapter models required for OAuth account linking", () => {
    const schema = readProjectFile("packages/db/prisma/schema.prisma");

    for (const model of ["User", "Account", "Session", "VerificationToken"]) {
      expect(schema).toContain(`model ${model} {`);
    }

    expect(schema).toContain("@@unique([provider, providerAccountId])");
  });

  it("renders OAuth login buttons from the registered provider list", () => {
    const loginPage = readProjectFile("apps/admin/src/app/(admin)/admin/login/page.tsx");

    expect(loginPage).toContain("getProviders");
    expect(loginPage).toContain("providers?.google");
    expect(loginPage).toContain("providers?.github");
  });
});
