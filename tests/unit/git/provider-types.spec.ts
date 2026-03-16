// tests/unit/git/provider-types.spec.ts
import { describe, it, expect } from "vitest";
import type { IssueDetail } from "@/lib/git/provider";

describe("IssueDetail 타입", () => {
  it("open 이슈 객체가 타입에 부합한다", () => {
    const detail: IssueDetail = {
      state: "open",
      assignees: [{ login: "alice", avatarUrl: "https://example.com/alice.png" }],
      labels: [{ name: "bug", color: "d73a4a" }],
      milestone: { title: "v1.0", dueOn: null, openIssues: 3, closedIssues: 7 },
      hasPR: false,
      updatedAt: "2026-03-01T00:00:00Z"
    };
    expect(detail.state).toBe("open");
    expect(detail.labels[0].color).toBe("d73a4a");
  });

  it("milestone이 null인 이슈 객체가 타입에 부합한다", () => {
    const detail: IssueDetail = {
      state: "closed",
      assignees: [],
      labels: [],
      milestone: null,
      hasPR: true,
      updatedAt: "2026-03-01T00:00:00Z"
    };
    expect(detail.milestone).toBeNull();
  });

  it("알 수 없는 state 값도 string으로 허용한다", () => {
    const detail: IssueDetail = {
      state: "locked",
      assignees: [],
      labels: [],
      milestone: null,
      hasPR: false,
      updatedAt: "2026-03-01T00:00:00Z"
    };
    expect(detail.state).toBe("locked");
  });
});
