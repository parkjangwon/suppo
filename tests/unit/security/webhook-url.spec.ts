import { describe, expect, it } from "vitest";

import { validateWebhookTargetUrl } from "@suppo/shared/security/webhook-url";

describe("validateWebhookTargetUrl", () => {
  it("allows public https webhook targets", () => {
    expect(validateWebhookTargetUrl("https://example.com/webhook", { allowPrivateHosts: false })).toEqual({
      valid: true,
    });
  });

  it("rejects insecure webhook protocols", () => {
    expect(validateWebhookTargetUrl("http://example.com/webhook", { allowPrivateHosts: false })).toEqual({
      valid: false,
      error: expect.stringContaining("https"),
    });
  });

  it("rejects localhost and private network targets", () => {
    expect(validateWebhookTargetUrl("https://localhost/webhook", { allowPrivateHosts: false })).toEqual({
      valid: false,
      error: expect.any(String),
    });
    expect(validateWebhookTargetUrl("https://127.0.0.1/webhook", { allowPrivateHosts: false })).toEqual({
      valid: false,
      error: expect.any(String),
    });
    expect(validateWebhookTargetUrl("https://10.0.0.5/webhook", { allowPrivateHosts: false })).toEqual({
      valid: false,
      error: expect.any(String),
    });
  });
});
