import { describe, expect, it, vi } from "vitest";

const MODULE_PATH = "@suppo/shared/security/ticket-access";
const ORIGINAL_SECRET = process.env.TICKET_ACCESS_SECRET;

describe("ticket access secret loading", () => {
  it("does not fail at import time when TICKET_ACCESS_SECRET is missing", async () => {
    vi.resetModules();
    delete process.env.TICKET_ACCESS_SECRET;

    await expect(import(MODULE_PATH)).resolves.toBeDefined();
  });

  it("returns null from verifyTicketAccessToken when TICKET_ACCESS_SECRET is missing", async () => {
    vi.resetModules();
    delete process.env.TICKET_ACCESS_SECRET;

    const { verifyTicketAccessToken } = await import(MODULE_PATH);

    await expect(verifyTicketAccessToken("invalid-token")).resolves.toBeNull();
  });

  it("throws a clear error from issueTicketAccessCookie when TICKET_ACCESS_SECRET is missing", async () => {
    vi.resetModules();
    delete process.env.TICKET_ACCESS_SECRET;

    const { issueTicketAccessCookie } = await import(MODULE_PATH);

    await expect(issueTicketAccessCookie("CRN-1", "user@example.com")).rejects.toThrow(
      "TICKET_ACCESS_SECRET environment variable is required"
    );
  });
});

afterAll(() => {
  vi.resetModules();
  if (typeof ORIGINAL_SECRET === "string") {
    process.env.TICKET_ACCESS_SECRET = ORIGINAL_SECRET;
  } else {
    delete process.env.TICKET_ACCESS_SECRET;
  }
});
