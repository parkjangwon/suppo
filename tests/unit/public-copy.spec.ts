import { describe, expect, it } from "vitest";

import { getPublicCopy } from "../../packages/shared/src/i18n/public-copy";

describe("public copy", () => {
  it("supports korean and english only", () => {
    expect(getPublicCopy("ko").ticketLookupTitle).toBe("티켓 조회");
    expect(getPublicCopy("en").ticketLookupTitle).toBe("Track your ticket");
    expect(getPublicCopy("fr").ticketLookupTitle).toBe("티켓 조회");
  });
});
