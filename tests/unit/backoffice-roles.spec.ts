import { describe, expect, it } from "vitest";

import { getBackofficeRoleLabel, isBackofficeRole } from "../../packages/shared/src/auth/config";

describe("backoffice roles", () => {
  it("accepts expanded backoffice roles", () => {
    expect(isBackofficeRole("ADMIN")).toBe(true);
    expect(isBackofficeRole("TEAM_LEAD")).toBe(true);
    expect(isBackofficeRole("AGENT")).toBe(true);
    expect(isBackofficeRole("VIEWER")).toBe(true);
    expect(isBackofficeRole("CUSTOMER")).toBe(false);
  });

  it("returns a readable korean label for each role", () => {
    expect(getBackofficeRoleLabel("ADMIN")).toBe("관리자");
    expect(getBackofficeRoleLabel("TEAM_LEAD")).toBe("팀장");
    expect(getBackofficeRoleLabel("AGENT")).toBe("상담원");
    expect(getBackofficeRoleLabel("VIEWER")).toBe("읽기전용");
  });
});
