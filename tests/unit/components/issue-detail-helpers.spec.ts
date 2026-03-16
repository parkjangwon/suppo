// tests/unit/components/issue-detail-helpers.spec.ts
import { describe, it, expect } from "vitest";
import {
  getStateBadgeClass,
  getLabelTextColor,
  formatMilestone
} from "@/components/ticket/issue-detail-helpers";

describe("getStateBadgeClass", () => {
  it("open → green 클래스 반환", () => {
    expect(getStateBadgeClass("open")).toBe("bg-green-100 text-green-700");
  });

  it("closed → purple 클래스 반환", () => {
    expect(getStateBadgeClass("closed")).toBe("bg-purple-100 text-purple-700");
  });

  it("locked 등 알 수 없는 값 → slate fallback 반환", () => {
    expect(getStateBadgeClass("locked")).toBe("bg-slate-100 text-slate-700");
    expect(getStateBadgeClass("unknown")).toBe("bg-slate-100 text-slate-700");
  });
});

describe("getLabelTextColor", () => {
  it("밝은 배경(흰색)에서 검은 텍스트 반환", () => {
    expect(getLabelTextColor("ffffff")).toBe("#000000");
  });

  it("어두운 배경(검정)에서 흰 텍스트 반환", () => {
    expect(getLabelTextColor("000000")).toBe("#ffffff");
  });

  it("GitHub red(d73a4a) → 흰 텍스트", () => {
    // R=215, G=58, B=74 → luminance = 0.299*215 + 0.587*58 + 0.114*74 ≈ 106.6 → 흰색
    expect(getLabelTextColor("d73a4a")).toBe("#ffffff");
  });

  it("GitHub yellow(FBCA04) → 검은 텍스트", () => {
    // R=251, G=202, B=4 → luminance ≈ 194.7 → 검은색
    expect(getLabelTextColor("FBCA04")).toBe("#000000");
  });
});

describe("formatMilestone", () => {
  it("openIssues + closedIssues > 0이면 진행률을 포함한다", () => {
    expect(formatMilestone({ title: "v1.0", dueOn: null, openIssues: 3, closedIssues: 7 }))
      .toBe("v1.0 (7/10 완료)");
  });

  it("openIssues + closedIssues === 0이면 제목만 반환한다", () => {
    expect(formatMilestone({ title: "v2.0", dueOn: null, openIssues: 0, closedIssues: 0 }))
      .toBe("v2.0");
  });
});
