import { describe, expect, it } from "vitest";

import { auditApiAuth } from "../../scripts/audit-api-auth.mjs";

describe("API authorization matrix audit", () => {
  it("keeps every admin API route in the authorization matrix", async () => {
    const rows = await auditApiAuth();
    const failures = rows.filter((row) => !row.ok);

    expect(rows.length).toBeGreaterThan(80);
    expect(failures).toEqual([]);
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        route: "/api/admin/system/backup",
        protection: "backoffice-session",
      }),
      expect.objectContaining({
        route: "/api/public/tickets",
        protection: "api-key",
      }),
      expect.objectContaining({
        route: "/api/internal/email-dispatch",
        protection: "internal-token",
      }),
      expect.objectContaining({
        route: "/api/webhooks/github",
        protection: "signed-webhook",
      }),
    ]));
  });
});
