import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitLabProvider } from "@/lib/git/providers/gitlab";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("GitLabProvider.getIssue()", () => {
  let provider: GitLabProvider;

  beforeEach(() => {
    provider = new GitLabProvider("test-token");
    mockFetch.mockReset();
  });

  it("GitLab 이슈 상세를 올바르게 파싱한다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        state: "opened",
        assignees: [{ username: "bob", avatar_url: "https://gitlab.com/bob.png" }],
        labels: ["frontend", "bug"],
        milestone: { title: "Sprint 1", due_date: "2026-04-01", open_issues_count: 2, closed_issues_count: 5 },
        updated_at: "2026-03-01T00:00:00Z"
      })
    });

    const detail = await provider.getIssue!("group/project", 7);

    expect(detail.state).toBe("opened");
    expect(detail.assignees).toEqual([{ login: "bob", avatarUrl: "https://gitlab.com/bob.png" }]);
    expect(detail.labels).toEqual([
      { name: "frontend", color: "000000" },
      { name: "bug", color: "000000" }
    ]);
    expect(detail.milestone?.title).toBe("Sprint 1");
    expect(detail.milestone?.dueOn).toBe("2026-04-01");
    expect(detail.milestone?.openIssues).toBe(2);
    expect(detail.milestone?.closedIssues).toBe(5);
    expect(detail.hasPR).toBe(false);  // GitLab은 항상 false
  });

  it("milestone이 없으면 null을 반환한다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        state: "closed", assignees: [], labels: [],
        milestone: null, updated_at: "2026-03-01T00:00:00Z"
      })
    });

    const detail = await provider.getIssue!("group/project", 1);
    expect(detail.milestone).toBeNull();
  });

  it("API 오류 시 에러를 throw한다", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
    await expect(provider.getIssue!("group/project", 1)).rejects.toThrow("403");
  });

  it("signal을 fetch에 전달한다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        state: "opened", assignees: [], labels: [],
        milestone: null, updated_at: "2026-03-01T00:00:00Z"
      })
    });

    const controller = new AbortController();
    await provider.getIssue!("group/project", 1, controller.signal);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal })
    );
  });
});
