// tests/unit/git/links-get-with-detail.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/git/links/route";
import { NextRequest } from "next/server";

// auth 모킹
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "ADMIN", agentId: "agent-1" }
  })
}));

// prisma 모킹 — mockCredential을 모듈 수준 변수로 추출해 테스트 내에서 직접 재설정 가능하게 함
const mockCredential = vi.hoisted(() => vi.fn().mockResolvedValue({ encryptedToken: "encrypted-token" }));

vi.mock("@suppo/db", () => ({
  prisma: {
    ticket: {
      findUnique: vi.fn().mockResolvedValue({ assigneeId: "agent-1" })
    },
    gitLink: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "link-1",
          provider: "GITHUB",
          repoFullName: "owner/repo",
          issueNumber: 42,
          issueUrl: "https://github.com/owner/repo/issues/42",
          createdAt: new Date("2026-01-01")
        }
      ])
    },
    gitProviderCredential: {
      findUnique: mockCredential
    }
  }
}));

// crypto 모킹
vi.mock("@suppo/shared/crypto/encrypt", () => ({
  decryptToken: vi.fn().mockReturnValue("plain-token")
}));

// GitHub provider 모킹
const mockGetIssue = vi.fn();
vi.mock("@/lib/git/providers/github", () => ({
  GitHubProvider: vi.fn().mockImplementation(function() {
    return { provider: "GITHUB", getIssue: mockGetIssue };
  })
}));

vi.mock("@/lib/git/providers/gitlab", () => ({
  GitLabProvider: vi.fn().mockImplementation(function() {
    return { provider: "GITLAB" };
  })
}));



describe("GET /api/git/links — issueDetail 포함", () => {
  beforeEach(() => {
    mockGetIssue.mockReset();
  });

  it("issueDetail을 포함한 링크 목록을 반환한다", async () => {
    mockGetIssue.mockResolvedValueOnce({
      state: "open",
      assignees: [],
      labels: [],
      milestone: null,
      hasPR: false,
      updatedAt: "2026-03-01T00:00:00Z"
    });

    const request = new NextRequest("http://localhost/api/git/links?ticketId=ticket-1");
    const response = await GET(request);
    const data = await response.json() as { links: Array<{ id: string; issueDetail: unknown }> };

    expect(response.status).toBe(200);
    expect(data.links).toHaveLength(1);
    expect(data.links[0].issueDetail).toMatchObject({ state: "open", hasPR: false });
  });

  it("getIssue 실패 시 issueDetail: null로 반환하고 나머지는 정상 처리한다", async () => {
    mockGetIssue.mockRejectedValueOnce(new Error("GitHub API error"));

    const request = new NextRequest("http://localhost/api/git/links?ticketId=ticket-1");
    const response = await GET(request);
    const data = await response.json() as { links: Array<{ id: string; issueDetail: unknown }> };

    expect(response.status).toBe(200);
    expect(data.links[0].issueDetail).toBeNull();
  });

  it("credential이 없으면 issueDetail: null을 반환한다", async () => {
    // 모듈 수준에서 선언된 mock을 직접 재설정 (dynamic import 불필요)
    mockCredential.mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/git/links?ticketId=ticket-1");
    const response = await GET(request);
    const data = await response.json() as { links: Array<{ id: string; issueDetail: unknown }> };

    expect(response.status).toBe(200);
    expect(data.links[0].issueDetail).toBeNull();
  });
});
