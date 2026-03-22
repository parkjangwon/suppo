import { describe, expect, it } from "vitest";

import { HELPDESK_CAPABILITY_DEFINITIONS } from "@/lib/helpdesk/capability-definitions";

describe("HELPDESK_CAPABILITY_DEFINITIONS", () => {
  it("defines every requested helpdesk capability with concrete metadata", () => {
    expect(HELPDESK_CAPABILITY_DEFINITIONS.map((item) => item.key)).toEqual([
      "sla",
      "automation",
      "queues",
      "customer360",
      "ticketRelations",
      "rbac",
      "integrations",
      "localization",
      "aiAutomation",
    ]);

    const localization = HELPDESK_CAPABILITY_DEFINITIONS.find((item) => item.key === "localization");
    expect(localization?.supportedLocales).toEqual(["ko", "en"]);
    expect(localization?.title).toBe("다국어");
  });
});
