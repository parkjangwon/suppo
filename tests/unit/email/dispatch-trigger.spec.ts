import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProcessOutbox = vi.hoisted(() => vi.fn());

vi.mock("@suppo/shared/email/process-outbox", () => ({
  processOutbox: mockProcessOutbox,
}));

import { dispatchEmailOutboxSoon } from "../../../packages/shared/src/email/dispatch-trigger";

describe("dispatchEmailOutboxSoon", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
    delete process.env.SUPPO_RUN_EMAIL_DISPATCH_IN_TESTS;
  });

  it("skips background dispatch in test environment by default", () => {
    dispatchEmailOutboxSoon();

    expect(mockProcessOutbox).not.toHaveBeenCalled();
  });

  it("allows explicit test dispatch when opted in", () => {
    process.env.SUPPO_RUN_EMAIL_DISPATCH_IN_TESTS = "true";
    mockProcessOutbox.mockResolvedValue({ processed: 0, delivered: 0, failed: 0, skipped: 0 });

    dispatchEmailOutboxSoon();

    expect(mockProcessOutbox).toHaveBeenCalledWith({ limit: 25 });
  });

  afterAll(() => {
    if (typeof originalNodeEnv === "string") {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    delete process.env.SUPPO_RUN_EMAIL_DISPATCH_IN_TESTS;
  });
});
