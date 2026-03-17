import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubProvider } from "@/lib/git/providers/github";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// 기본 이슈 응답 fixture
const baseIssue = {
  state: "open",
  assignees: [{ login: "alice", avatar_url: "https://example.com/alice.png" }],
  labels: [{ name: "bug", color: "d73a4a" }],
  milestone: null,
  pull_request: undefined,
  updated_at: "2026-03-01T00:00:00Z",
  comments: 12
};

describe("GitHubProvider.getIssueFullDetail()", () => {
  let provider: GitHubProvider;

  beforeEach(() => {
    provider = new GitHubProvider("test-token");
    mockFetch.mockReset();
  });

  it("PR 없는 이슈: linkedPRs가 빈 배열이다", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => baseIssue })
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // comments
      .mockResolvedValueOnce({ ok: true, json: async () => [] }); // timeline — 이벤트 없음

    const detail = await provider.getIssueFullDetail!("owner/repo", 42);

    expect(detail.linkedPRs).toHaveLength(0);
    expect(detail.commentCount).toBe(12);
    expect(detail.comments).toHaveLength(0);
  });

  it("코멘트 3개를 올바르게 매핑한다", async () => {
    const comments = [
      { id: 1, user: { login: "bob", avatar_url: "https://example.com/bob.png" }, body: "LGTM", created_at: "2026-03-01T01:00:00Z" },
      { id: 2, user: { login: "alice", avatar_url: "https://example.com/alice.png" }, body: "Thanks!", created_at: "2026-03-01T02:00:00Z" },
    ];

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => baseIssue })
      .mockResolvedValueOnce({ ok: true, json: async () => comments })
      .mockResolvedValueOnce({ ok: true, json: async () => [] }); // timeline

    const detail = await provider.getIssueFullDetail!("owner/repo", 42);

    expect(detail.comments).toHaveLength(2);
    expect(detail.comments[0]).toEqual({
      id: 1,
      author: { login: "bob", avatarUrl: "https://example.com/bob.png" },
      body: "LGTM",
      createdAt: "2026-03-01T01:00:00Z"
    });
  });

  it("timeline cross_referenced 이벤트에서 PR 번호를 추출해 PR 상세를 fetch한다", async () => {
    const timelineEvents = [
      {
        event: "cross_referenced",
        source: { type: "issue", issue: { number: 10, pull_request: { url: "..." } } }
      }
    ];
    const prData = {
      number: 10,
      title: "fix: resolve null pointer",
      state: "closed",
      merged_at: "2026-03-02T00:00:00Z",
      head: { ref: "feature/fix" },
      base: { ref: "main" },
      draft: false,
      html_url: "https://github.com/owner/repo/pull/10",
      requested_reviewers: []
    };
    const reviewsData = [
      { user: { login: "charlie" }, state: "APPROVED" }
    ];

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => baseIssue })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })       // comments
      .mockResolvedValueOnce({ ok: true, json: async () => timelineEvents }) // timeline
      .mockResolvedValueOnce({ ok: true, json: async () => prData })   // PR
      .mockResolvedValueOnce({ ok: true, json: async () => reviewsData }); // reviews

    const detail = await provider.getIssueFullDetail!("owner/repo", 42);

    expect(detail.linkedPRs).toHaveLength(1);
    expect(detail.linkedPRs[0].state).toBe("merged"); // closed + merged_at
    expect(detail.linkedPRs[0].headBranch).toBe("feature/fix");
    expect(detail.linkedPRs[0].baseBranch).toBe("main");
    expect(detail.linkedPRs[0].reviewDecision).toBe("approved");
  });

  it("리뷰 상태: requested_reviewers가 빈 배열이면 null 반환", async () => {
    const timelineEvents = [
      { event: "cross_referenced", source: { type: "issue", issue: { number: 5, pull_request: {} } } }
    ];
    const prData = {
      number: 5, title: "wip", state: "open", merged_at: null,
      head: { ref: "feature/wip" }, base: { ref: "main" },
      draft: false, html_url: "...", requested_reviewers: []
    };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => baseIssue })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => timelineEvents })
      .mockResolvedValueOnce({ ok: true, json: async () => prData })
      .mockResolvedValueOnce({ ok: true, json: async () => [] }); // reviews empty

    const detail = await provider.getIssueFullDetail!("owner/repo", 42);
    expect(detail.linkedPRs[0].reviewDecision).toBeNull();
  });

  it("리뷰 상태: requested_reviewers.length > 0이면 review_required", async () => {
    const timelineEvents = [
      { event: "cross_referenced", source: { type: "issue", issue: { number: 5, pull_request: {} } } }
    ];
    const prData = {
      number: 5, title: "wip", state: "open", merged_at: null,
      head: { ref: "feature/wip" }, base: { ref: "main" },
      draft: false, html_url: "...", requested_reviewers: [{ login: "alice" }]
    };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => baseIssue })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => timelineEvents })
      .mockResolvedValueOnce({ ok: true, json: async () => prData })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const detail = await provider.getIssueFullDetail!("owner/repo", 42);
    expect(detail.linkedPRs[0].reviewDecision).toBe("review_required");
  });

  it("리뷰 상태: CHANGES_REQUESTED가 있으면 changes_requested (APPROVED가 있어도)", async () => {
    const timelineEvents = [
      { event: "cross_referenced", source: { type: "issue", issue: { number: 5, pull_request: {} } } }
    ];
    const prData = {
      number: 5, title: "wip", state: "open", merged_at: null,
      head: { ref: "feature/wip" }, base: { ref: "main" },
      draft: false, html_url: "...", requested_reviewers: []
    };
    const reviewsData = [
      { user: { login: "alice" }, state: "APPROVED" },
      { user: { login: "bob" }, state: "CHANGES_REQUESTED" }
    ];

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => baseIssue })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => timelineEvents })
      .mockResolvedValueOnce({ ok: true, json: async () => prData })
      .mockResolvedValueOnce({ ok: true, json: async () => reviewsData });

    const detail = await provider.getIssueFullDetail!("owner/repo", 42);
    expect(detail.linkedPRs[0].reviewDecision).toBe("changes_requested");
  });

  it("timeline API 호출 시 mockingbird-preview 헤더를 포함한다", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => baseIssue })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    await provider.getIssueFullDetail!("owner/repo", 42);

    const timelineCall = mockFetch.mock.calls[2];
    expect(timelineCall[1].headers.Accept).toBe("application/vnd.github.mockingbird-preview+json");
  });

  it("signal을 모든 fetch 호출에 전달한다", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => baseIssue })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const controller = new AbortController();
    await provider.getIssueFullDetail!("owner/repo", 42, controller.signal);

    for (const call of mockFetch.mock.calls) {
      expect(call[1].signal).toBe(controller.signal);
    }
  });

  it("이슈 API 실패 시 에러를 throw한다", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(provider.getIssueFullDetail!("owner/repo", 99)).rejects.toThrow("404");
  });
});
