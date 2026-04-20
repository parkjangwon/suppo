import { describe, expect, it } from "vitest";

import {
  createPublicKnowledgeUrl,
  getPublicAppUrl,
} from "@suppo/shared/utils/public-app-url";

describe("public app url helpers", () => {
  it("uses the configured public url and trims the trailing slash", () => {
    expect(getPublicAppUrl("https://helpdesk.example.com/")).toBe(
      "https://helpdesk.example.com"
    );
  });

  it("falls back to localhost:3000 when no public url is configured", () => {
    expect(getPublicAppUrl()).toBe("http://localhost:3000");
  });

  it("builds a knowledge article url on the public app origin", () => {
    expect(
      createPublicKnowledgeUrl("faq-login", "https://helpdesk.example.com/")
    ).toBe("https://helpdesk.example.com/knowledge/faq-login");
  });
});
