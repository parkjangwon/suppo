import path from "node:path";
import { describe, expect, it } from "vitest";

import { resolveDatabaseUrl } from "../../packages/db/src/resolve-database-url";

describe("resolveDatabaseUrl", () => {
  it("converts a relative file DATABASE_URL into an absolute workspace path", () => {
    const resolved = resolveDatabaseUrl({
      cwd: "/Users/pjw/dev/project/crinity/crinity-helpdesk/apps/public",
      configuredUrl: "file:./packages/db/dev.db",
    });

    expect(resolved).toBe(
      `file:${path.resolve("/Users/pjw/dev/project/crinity/crinity-helpdesk", "packages/db/dev.db")}`
    );
  });
});
