import { describe, expect, it } from "vitest";

import { getAdminNavSections } from "@/lib/navigation/admin-nav";

describe("getAdminNavSections", () => {
  it("hides admin-only entries for agents", () => {
    const sections = getAdminNavSections(false);
    const labels = sections.flatMap((section) => section.items.map((item) => item.label));

    expect(labels).toContain("대시보드");
    expect(labels).toContain("응답 템플릿");
    expect(labels).not.toContain("업무 규칙");
    expect(labels).not.toContain("채팅 설정");
    expect(labels).not.toContain("연동 설정");
    expect(labels).not.toContain("팀 관리");
    expect(labels).not.toContain("고객 관리");
    expect(labels).not.toContain("감사 로그");
    expect(labels).not.toContain("문의 유형");
  });

  it("shows all sections for admins", () => {
    const sections = getAdminNavSections(true);
    const labels = sections.flatMap((section) => section.items.map((item) => item.label));

    expect(labels).toContain("업무 규칙");
    expect(labels).toContain("채팅 설정");
    expect(labels).toContain("연동 설정");
    expect(labels).toContain("팀 관리");
    expect(labels).toContain("고객 관리");
    expect(labels).toContain("감사 로그");
    expect(labels).toContain("문의 유형");
  });
});
