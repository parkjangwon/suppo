import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitLabProvider } from "@/lib/git/providers/gitlab";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const baseIssue = {
  state: "opened",
  assignees: [{ username: "bob", avatar_url: "https://gitlab.com/bob.png" }],
  labels: ["frontend", "bug"],
  milestone: null,
  updated_at: "2026-03-01T00:00:00Z",
  user_notes_count: 5,
  web_url: "https://gitlab.com/group/project/-/issues/7"
};

describe("GitLabProvider.getIssueFullDetail()", () => {
  let provider: GitLabProvider;

  beforeEach(() => {
    provider = new GitLabProvider("test-token");
    mockFetch.mockReset();
  });

  it("기본 이슈 정보를 올바르게 매핑한다", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => baseIssue })
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // notes
      .mockResolvedValueOnce({ ok: true, json: async () => [] }); // MRs

    const detail = await provider.getIssueFullDetail!("group/project", 7);

    expect(detail.state).toBe("opened");
    expect(detail.assignees).toEqual([{ login: "bob", avatarUrl: "https://gitlab.com/bob.png" }]);
    expect(detail.commentCount).toBe(5);
    expect(detail.linkedPRs).toHaveLength(0);
  });

  it("system 노트를 필터링하고 사람 코멘트만 반환한다", async () => {
    const notes = [
      { id: 1, author: { username: "alice", avatar_url: "https://gitlab.com/alice.png" }, body: "Nice work", created_at: "2026-03-01T01:00:00Z", system: false },
      { id: 2, author: { username: "gitlab-bot", avatar_url: "" }, body: "assigned to alice", created_at: "2026-03-01T02:00:00Z", system: true }
    ];

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => baseIssue })
      .mockResolvedValueOnce({ ok: true, json: async () => notes })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const detail = await provider.getIssueFullDetail!("group/project", 7);

    expect(detail.comments).toHaveLength(1);
    expect(detail.comments[0].author.login).toBe("alice");
  });

  it("MR state를 올바르게 정규화한다 (opened→open, merged→merged)", async () => {
    const mrs = [
      { iid: 3, title: "fix: null pointer", state: "merged", source_branch: "feature/fix", target_branch: "main", draft: false, web_url: "https://gitlab.com/group/project/-/merge_requests/3" },
      { iid: 4, title: "feat: new ui", state: "opened", source_branch: "feature/ui", target_branch: "main", draft: false, web_url: "https://gitlab.com/group/project/-/merge_requests/4" }
    ];

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => baseIssue })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => mrs });

    const detail = await provider.getIssueFullDetail!("group/project", 7);

    expect(detail.linkedPRs).toHaveLength(2);
    expect(detail.linkedPRs[0].state).toBe("merged");
    expect(detail.linkedPRs[1].state).toBe("open");
    expect(detail.linkedPRs[0].reviewDecision).toBeNull(); // GitLab: always null
  });

  it("notes API 실패 시 comments: []로 부분 성공 처리한다", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => baseIssue })
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const detail = await provider.getIssueFullDetail!("group/project", 7);
    expect(detail.comments).toHaveLength(0);
    expect(detail.state).toBe("opened"); // 이슈 기본 정보는 표시됨
  });

  it("이슈 API 실패 시 에러를 throw한다", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(provider.getIssueFullDetail!("group/project", 99)).rejects.toThrow("404");
  });
});
