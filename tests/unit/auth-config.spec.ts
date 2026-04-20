import { afterAll, describe, expect, it, vi } from "vitest";

const MODULE_PATH = "../../packages/shared/src/auth/config";
const ORIGINAL_SECRET = process.env.AUTH_SECRET;

describe("auth config import safety", () => {
  it("does not fail at import time when AUTH_SECRET is missing", async () => {
    vi.resetModules();
    delete process.env.AUTH_SECRET;

    await expect(import(MODULE_PATH)).resolves.toBeDefined();
  });
});

afterAll(() => {
  vi.resetModules();
  if (typeof ORIGINAL_SECRET === "string") {
    process.env.AUTH_SECRET = ORIGINAL_SECRET;
  } else {
    delete process.env.AUTH_SECRET;
  }
});
