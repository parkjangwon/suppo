import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

describe("monorepo workspace structure", () => {
  it("creates the admin/public apps and shared packages manifests", () => {
    const requiredFiles = [
      "pnpm-workspace.yaml",
      "tsconfig.base.json",
      "apps/admin/package.json",
      "apps/public/package.json",
      "packages/db/package.json",
      "packages/shared/package.json",
      "packages/ui/package.json"
    ];

    for (const relativePath of requiredFiles) {
      expect(existsSync(path.join(root, relativePath)), relativePath).toBe(true);
    }
  });
});
