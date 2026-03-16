import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubProvider } from "@/lib/git/providers/github";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("GitHubProvider.getIssue()", () => {
  let provider: GitHubProvider;

  beforeEach(() => {
    provider = new GitHubProvider("test-token");
    mockFetch.mockReset();
  });

  it("open 이슈의 상세 정보를 올바르게 파싱한다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        state: "open",
        assignees: [{ login: "alice", avatar_url: "https://example.com/alice.png" }],
        labels: [{ name: "bug", color: "d73a4a" }],
        milestone: { title: "v1.0", due_on: null, open_issues: 3, closed_issues: 7 },
        pull_request: undefined,
        updated_at: "2026-03-01T00:00:00Z"
      })
    });

    const detail = await provider.getIssue!("owner/repo", 42);

    expect(detail.state).toBe("open");
    expect(detail.assignees).toEqual([{ login: "alice", avatarUrl: "https://example.com/alice.png" }]);
    expect(detail.labels).toEqual([{ name: "bug", color: "d73a4a" }]);
    expect(detail.milestone).toEqual({ title: "v1.0", dueOn: null, openIssues: 3, closedIssues: 7 });
    expect(detail.hasPR).toBe(false);
    expect(detail.updatedAt).toBe("2026-03-01T00:00:00Z");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner/repo/issues/42",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token" })
      })
    );
  });

  it("PR이 연결된 이슈는 hasPR: true를 반환한다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        state: "closed",
        assignees: [],
        labels: [],
        milestone: null,
        pull_request: { url: "https://github.com/owner/repo/pull/10" },
        updated_at: "2026-03-01T00:00:00Z"
      })
    });

    const detail = await provider.getIssue!("owner/repo", 42);
    expect(detail.hasPR).toBe(true);
  });

  it("milestone이 없으면 null을 반환한다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        state: "open",
        assignees: [],
        labels: [],
        milestone: null,
        pull_request: undefined,
        updated_at: "2026-03-01T00:00:00Z"
      })
    });

    const detail = await provider.getIssue!("owner/repo", 1);
    expect(detail.milestone).toBeNull();
  });

  it("API 오류 시 에러를 throw한다", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(provider.getIssue!("owner/repo", 99)).rejects.toThrow("404");
  });

  it("signal을 fetch에 전달한다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        state: "open", assignees: [], labels: [], milestone: null,
        pull_request: undefined, updated_at: "2026-03-01T00:00:00Z"
      })
    });

    const controller = new AbortController();
    await provider.getIssue!("owner/repo", 1, controller.signal);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal })
    );
  });
});
