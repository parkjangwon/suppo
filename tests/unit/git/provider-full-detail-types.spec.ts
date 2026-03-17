import { describe, it, expect } from "vitest";
import type { IssueComment, LinkedPR, IssueFullDetail } from "@/lib/git/provider";

describe("IssueComment 타입", () => {
  it("필수 필드를 갖는 객체가 타입에 부합한다", () => {
    const comment: IssueComment = {
      id: 1,
      author: { login: "alice", avatarUrl: "https://example.com/alice.png" },
      body: "LGTM!",
      createdAt: "2026-03-01T00:00:00Z"
    };
    expect(comment.author.login).toBe("alice");
  });
});

describe("LinkedPR 타입", () => {
  it("merged PR 객체가 타입에 부합한다", () => {
    const pr: LinkedPR = {
      number: 10,
      title: "fix: resolve null pointer",
      state: "merged",
      headBranch: "feature/fix",
      baseBranch: "main",
      reviewDecision: "approved",
      isDraft: false,
      url: "https://github.com/owner/repo/pull/10"
    };
    expect(pr.state).toBe("merged");
    expect(pr.reviewDecision).toBe("approved");
  });

  it("reviewDecision이 null인 PR도 허용한다", () => {
    const pr: LinkedPR = {
      number: 5,
      title: "wip",
      state: "open",
      headBranch: "feature/wip",
      baseBranch: "main",
      reviewDecision: null,
      isDraft: true,
      url: "https://github.com/owner/repo/pull/5"
    };
    expect(pr.reviewDecision).toBeNull();
    expect(pr.isDraft).toBe(true);
  });
});

describe("IssueFullDetail 타입", () => {
  it("IssueDetail 필드를 포함한 full detail 객체가 타입에 부합한다", () => {
    const detail: IssueFullDetail = {
      state: "open",
      assignees: [],
      labels: [],
      milestone: null,
      hasPR: true,
      updatedAt: "2026-03-01T00:00:00Z",
      comments: [],
      commentCount: 12,
      linkedPRs: []
    };
    expect(detail.commentCount).toBe(12);
    expect(detail.linkedPRs).toHaveLength(0);
  });
});
