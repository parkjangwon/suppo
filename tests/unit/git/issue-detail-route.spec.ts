// tests/unit/git/issue-detail-route.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/git/issue-detail/route";
import { NextRequest } from "next/server";

const { mockLink, mockCredential, mockGetIssueFullDetail } = vi.hoisted(() => ({
  mockLink: vi.fn(),
  mockCredential: vi.fn(),
  mockGetIssueFullDetail: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "ADMIN", agentId: "agent-1" }
  })
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    ticket: {
      findUnique: vi.fn().mockResolvedValue({ assigneeId: "agent-1" })
    },
    gitLink: {
      findUnique: mockLink
    },
    gitProviderCredential: {
      findUnique: mockCredential
    }
  }
}));

vi.mock("@/lib/crypto/encrypt", () => ({
  decryptToken: vi.fn().mockReturnValue("plain-token")
}));

vi.mock("@/lib/git/providers/github", () => ({
  GitHubProvider: vi.fn().mockImplementation(() => ({
    provider: "GITHUB",
    getIssueFullDetail: mockGetIssueFullDetail
  }))
}));

vi.mock("@/lib/git/providers/gitlab", () => ({
  GitLabProvider: vi.fn().mockImplementation(() => ({
    provider: "GITLAB"
    // getIssueFullDetail 미구현
  }))
}));

const sampleFullDetail = {
  state: "open", assignees: [], labels: [], milestone: null,
  hasPR: false, updatedAt: "2026-03-01T00:00:00Z",
  comments: [], commentCount: 0, linkedPRs: []
};

describe("GET /api/git/issue-detail", () => {
  beforeEach(() => {
    mockLink.mockReset();
    mockCredential.mockReset();
    mockGetIssueFullDetail.mockReset();
  });

  it("정상 응답: { detail: IssueFullDetail }", async () => {
    mockLink.mockResolvedValueOnce({
      ticketId: "ticket-1", provider: "GITHUB",
      repoFullName: "owner/repo", issueNumber: 42
    });
    mockCredential.mockResolvedValueOnce({ encryptedToken: "encrypted" });
    mockGetIssueFullDetail.mockResolvedValueOnce(sampleFullDetail);

    const req = new NextRequest("http://localhost/api/git/issue-detail?ticketId=ticket-1&linkId=link-1");
    const res = await GET(req);
    const data = await res.json() as { detail: typeof sampleFullDetail };

    expect(res.status).toBe(200);
    expect(data.detail.state).toBe("open");
  });

  it("linkId가 ticketId에 속하지 않으면 404를 반환한다", async () => {
    mockLink.mockResolvedValueOnce({
      ticketId: "other-ticket", provider: "GITHUB",
      repoFullName: "owner/repo", issueNumber: 42
    });

    const req = new NextRequest("http://localhost/api/git/issue-detail?ticketId=ticket-1&linkId=link-1");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("link가 존재하지 않으면 404를 반환한다", async () => {
    mockLink.mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/git/issue-detail?ticketId=ticket-1&linkId=link-999");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("credential이 없으면 500을 반환한다", async () => {
    mockLink.mockResolvedValueOnce({
      ticketId: "ticket-1", provider: "GITHUB",
      repoFullName: "owner/repo", issueNumber: 42
    });
    mockCredential.mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/git/issue-detail?ticketId=ticket-1&linkId=link-1");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("getIssueFullDetail 미구현 provider(GitLab)는 404를 반환한다", async () => {
    mockLink.mockResolvedValueOnce({
      ticketId: "ticket-1", provider: "GITLAB",
      repoFullName: "group/project", issueNumber: 7
    });
    mockCredential.mockResolvedValueOnce({ encryptedToken: "encrypted" });

    const req = new NextRequest("http://localhost/api/git/issue-detail?ticketId=ticket-1&linkId=link-2");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
