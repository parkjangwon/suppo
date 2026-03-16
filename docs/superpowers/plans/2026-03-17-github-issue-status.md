# GitHub 이슈 상태 및 진척도 표시 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 티켓 상세 화면에서 연결된 GitHub/GitLab 이슈의 상태·담당자·레이블·마일스톤·PR 연결 여부·업데이트 일시를 인라인으로 표시한다.

**Architecture:** `/api/git/links` GET 엔드포인트가 기존 링크 목록을 반환할 때 각 이슈의 상세 정보를 provider별로 병렬 fetch해서 `issueDetail` 필드로 함께 반환한다. 프론트엔드는 SSR로 링크 목록을 빠르게 렌더링하고, 마운트 후 `useEffect`로 상세 정보를 비동기 fetch해서 인라인으로 표시한다. 상담원에게는 쓰기 UI를 제외한 읽기 전용 컴포넌트를 보여준다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma/SQLite, Vitest, Tailwind CSS, date-fns

---

## Chunk 1: 데이터 레이어 (Provider + API)

### Task 1: `IssueDetail` 타입과 `getIssue()` 인터페이스 추가

**Files:**
- Modify: `src/lib/git/provider.ts`
- Test: `tests/unit/git/provider-types.spec.ts`

- [ ] **Step 1: 테스트 파일 생성 — `IssueDetail` 타입 구조 검증**

```typescript
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
```

- [ ] **Step 2: 테스트 실행 — 타입 에러로 실패 확인**

```bash
pnpm test tests/unit/git/provider-types.spec.ts
```

Expected: 컴파일 에러 또는 `IssueDetail` not found

- [ ] **Step 3: `src/lib/git/provider.ts`에 `IssueDetail` 타입과 `getIssue()` 추가**

```typescript
// src/lib/git/provider.ts 에 기존 내용 이후 추가

export interface IssueDetail {
  state: string;  // 'open' | 'closed' | 'locked' 등, UI에서 fallback 처리
  assignees: { login: string; avatarUrl: string }[];
  labels: { name: string; color: string }[];  // color: 6자리 hex (# 없음)
  milestone: {
    title: string;
    dueOn: string | null;
    openIssues: number;
    closedIssues: number;
  } | null;
  hasPR: boolean;
  updatedAt: string;  // ISO 8601
}

// GitIssueProvider 인터페이스에 getIssue optional 메서드 추가
// (기존 인터페이스를 다음으로 교체)
export interface GitIssueProvider {
  readonly provider: GitProvider;
  searchIssues(input: SearchIssuesInput): Promise<GitIssueSummary[]>;
  createIssue(input: CreateIssueInput): Promise<GitIssueSummary>;
  getIssue?(repoFullName: string, issueNumber: number, signal?: AbortSignal): Promise<IssueDetail>;
}
```

- [ ] **Step 4: 테스트 재실행 — 통과 확인**

```bash
pnpm test tests/unit/git/provider-types.spec.ts
```

Expected: 3 tests passed

- [ ] **Step 5: TypeScript 타입 체크 통과 확인**

```bash
pnpm exec tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add src/lib/git/provider.ts tests/unit/git/provider-types.spec.ts
git commit -m "feat: IssueDetail 타입 및 getIssue optional 인터페이스 추가"
```

---

### Task 2: `GitHubProvider.getIssue()` 구현

**Files:**
- Modify: `src/lib/git/providers/github.ts`
- Test: `tests/unit/git/github-provider.spec.ts`

- [ ] **Step 1: 테스트 파일 생성**

```typescript
// tests/unit/git/github-provider.spec.ts
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
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm test tests/unit/git/github-provider.spec.ts
```

Expected: `provider.getIssue is not a function` 또는 유사한 오류

- [ ] **Step 3: `GitHubProvider`에 `getIssue()` 구현**

`src/lib/git/providers/github.ts` 파일의 `GitHubProvider` 클래스에 다음 메서드 추가 (기존 `createIssue` 메서드 뒤):

```typescript
  async getIssue(repoFullName: string, issueNumber: number, signal?: AbortSignal): Promise<IssueDetail> {
    const repo = validateRepoFullName(repoFullName);
    const url = `${GITHUB_API_BASE}/repos/${repo}/issues/${issueNumber}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
      signal
    });

    if (!response.ok) {
      throw new Error(`GitHub getIssue failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      state: string;
      assignees: Array<{ login: string; avatar_url: string }>;
      labels: Array<{ name: string; color: string }>;
      milestone: {
        title: string;
        due_on: string | null;
        open_issues: number;
        closed_issues: number;
      } | null;
      pull_request?: unknown;
      updated_at: string;
    };

    return {
      state: data.state,
      assignees: data.assignees.map((a) => ({ login: a.login, avatarUrl: a.avatar_url })),
      labels: data.labels,
      milestone: data.milestone
        ? {
            title: data.milestone.title,
            dueOn: data.milestone.due_on,
            openIssues: data.milestone.open_issues,
            closedIssues: data.milestone.closed_issues
          }
        : null,
      hasPR: data.pull_request !== undefined && data.pull_request !== null,
      updatedAt: data.updated_at
    };
  }
```

또한 파일 상단 import에 `IssueDetail` 추가:

```typescript
import {
  type CreateIssueInput,
  type GitIssueProvider,
  type GitIssueSummary,
  type IssueDetail,          // ← 추가
  type SearchIssuesInput,
  resolveLimit,
  validateRepoFullName
} from "@/lib/git/provider";
```

- [ ] **Step 4: 테스트 재실행 — 통과 확인**

```bash
pnpm test tests/unit/git/github-provider.spec.ts
```

Expected: 5 tests passed

- [ ] **Step 5: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 6: 커밋**

```bash
git add src/lib/git/providers/github.ts tests/unit/git/github-provider.spec.ts
git commit -m "feat: GitHubProvider.getIssue() 구현"
```

---

### Task 3: `GitLabProvider.getIssue()` 구현

**Files:**
- Modify: `src/lib/git/providers/gitlab.ts`
- Test: `tests/unit/git/gitlab-provider.spec.ts`

- [ ] **Step 1: 테스트 파일 생성**

```typescript
// tests/unit/git/gitlab-provider.spec.ts
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
```

> **참고 — GitLab 응답 매핑 규칙:**
> - `state`: `"opened"` 등 그대로 반환 (GitLab은 `opened`/`closed` 사용)
> - `assignees`: `username` → `login`, `avatar_url` → `avatarUrl`
> - `labels`: GitLab label은 문자열 배열로 오므로 `{ name, color: "000000" }`으로 변환 (색상 정보 없음)
> - `milestone`: `open_issues_count` → `openIssues`, `closed_issues_count` → `closedIssues`, `due_date` → `dueOn`
> - `hasPR`: 항상 `false`

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm test tests/unit/git/gitlab-provider.spec.ts
```

Expected: `provider.getIssue is not a function`

- [ ] **Step 3: `GitLabProvider`에 `getIssue()` 구현**

`src/lib/git/providers/gitlab.ts` 파일 상단 import에 `IssueDetail` 추가:

```typescript
import {
  type CreateIssueInput,
  type GitIssueProvider,
  type GitIssueSummary,
  type IssueDetail,          // ← 추가
  type SearchIssuesInput,
  resolveLimit,
  validateRepoFullName
} from "@/lib/git/provider";
```

`GitLabProvider` 클래스에 다음 메서드 추가 (기존 `createIssue` 메서드 뒤):

```typescript
  async getIssue(repoFullName: string, issueNumber: number, signal?: AbortSignal): Promise<IssueDetail> {
    const repoPath = validateRepoFullName(repoFullName);
    const projectPath = encodeURIComponent(repoPath);
    const url = `${GITLAB_API_BASE}/projects/${projectPath}/issues/${issueNumber}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
      signal
    });

    if (!response.ok) {
      throw new Error(`GitLab getIssue failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      state: string;
      assignees: Array<{ username: string; avatar_url: string }>;
      labels: string[];
      milestone: {
        title: string;
        due_date: string | null;
        open_issues_count: number;
        closed_issues_count: number;
      } | null;
      updated_at: string;
    };

    return {
      state: data.state,
      assignees: data.assignees.map((a) => ({ login: a.username, avatarUrl: a.avatar_url })),
      labels: data.labels.map((name) => ({ name, color: "000000" })),
      milestone: data.milestone
        ? {
            title: data.milestone.title,
            dueOn: data.milestone.due_date,
            openIssues: data.milestone.open_issues_count,
            closedIssues: data.milestone.closed_issues_count
          }
        : null,
      hasPR: false,
      updatedAt: data.updated_at
    };
  }
```

- [ ] **Step 4: 테스트 재실행 — 통과 확인**

```bash
pnpm test tests/unit/git/gitlab-provider.spec.ts
```

Expected: 4 tests passed

- [ ] **Step 5: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 6: 커밋**

```bash
git add src/lib/git/providers/gitlab.ts tests/unit/git/gitlab-provider.spec.ts
git commit -m "feat: GitLabProvider.getIssue() 구현 (hasPR: false 고정)"
```

---

### Task 4: `/api/git/links` GET 엔드포인트에 `issueDetail` 추가

**Files:**
- Modify: `src/app/api/git/links/route.ts`
- Test: `tests/unit/git/links-get-with-detail.spec.ts`

- [ ] **Step 1: 테스트 파일 생성**

```typescript
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
const mockCredential = vi.fn().mockResolvedValue({ encryptedToken: "encrypted-token" });

vi.mock("@/lib/db/client", () => ({
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
vi.mock("@/lib/crypto/encrypt", () => ({
  decryptToken: vi.fn().mockReturnValue("plain-token")
}));

// GitHub provider 모킹
const mockGetIssue = vi.fn();
vi.mock("@/lib/git/providers/github", () => ({
  GitHubProvider: vi.fn().mockImplementation(() => ({
    provider: "GITHUB",
    getIssue: mockGetIssue
  }))
}));

vi.mock("@/lib/git/providers/gitlab", () => ({
  GitLabProvider: vi.fn().mockImplementation(() => ({
    provider: "GITLAB"
  }))
}));

vi.mock("@/lib/git/providers/codecommit", () => ({
  CodeCommitProvider: vi.fn().mockImplementation(() => ({
    provider: "CODECOMMIT"
  }))
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
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm test tests/unit/git/links-get-with-detail.spec.ts
```

Expected: `issueDetail` 필드가 없어 테스트 실패

- [ ] **Step 3: Prisma 모델명 확인**

```bash
grep "model GitProviderCredential" prisma/schema.prisma
```

Expected: `model GitProviderCredential {` 출력. 이름이 다르면 이후 코드의 `prisma.gitProviderCredential` 접근자 이름을 맞춰서 수정해야 한다.

- [ ] **Step 4: `src/app/api/git/links/route.ts` GET 핸들러 수정**

기존 GET 핸들러에서 `return NextResponse.json({ links });` 전에 issueDetail 병렬 fetch 로직을 추가한다.

> **중요 — try/catch 스코프:** 기존 GET 핸들러 전체가 `try { ... } catch (error) { ... }` 블록으로 감싸져 있다. 아래 블록은 반드시 `try` 내부에서, `const links = await prisma.gitLink.findMany(...)` 이후에 삽입해야 한다. `try` 블록 밖에 삽입하면 500 에러 핸들링이 깨진다.

파일 상단 import에 추가:

```typescript
import { decryptToken } from "@/lib/crypto/encrypt";
import type { IssueDetail } from "@/lib/git/provider";
import { GitHubProvider } from "@/lib/git/providers/github";
import { GitLabProvider } from "@/lib/git/providers/gitlab";
```

GET 핸들러 내부 `const links = await prisma.gitLink.findMany(...)` 이후, `return NextResponse.json({ links })` 전에 다음 블록 삽입:

```typescript
    // provider별 credential 조회 (중복 fetch 방지)
    type GitProviderClient = {
      getIssue?: (repo: string, num: number, signal?: AbortSignal) => Promise<IssueDetail>;
    };
    const providerClientCache = new Map<string, GitProviderClient | null>();

    async function getProviderClient(provider: string): Promise<GitProviderClient | null> {
      if (providerClientCache.has(provider)) return providerClientCache.get(provider)!;

      const credential = await prisma.gitProviderCredential.findUnique({
        where: { provider: provider as "GITHUB" | "GITLAB" | "CODECOMMIT" },
        select: { encryptedToken: true }
      });

      if (!credential) {
        providerClientCache.set(provider, null);
        return null;
      }

      const token = decryptToken(credential.encryptedToken);
      let client: GitProviderClient | null = null;

      if (provider === "GITHUB") client = new GitHubProvider(token);
      else if (provider === "GITLAB") client = new GitLabProvider(token);
      // CODECOMMIT: getIssue 미구현, null 처리

      providerClientCache.set(provider, client);
      return client;
    }

    // 각 링크에 대해 issueDetail 병렬 fetch (3초 타임아웃)
    const detailResults = await Promise.allSettled(
      links.map(async (link) => {
        const client = await getProviderClient(link.provider);
        if (!client?.getIssue) return null;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        try {
          return await client.getIssue(link.repoFullName, link.issueNumber, controller.signal);
        } catch {
          return null;
        } finally {
          clearTimeout(timer);
        }
      })
    );

    const linksWithDetail = links.map((link, index) => {
      const result = detailResults[index];
      const issueDetail = result.status === "fulfilled" ? result.value : null;
      return { ...link, issueDetail };
    });

    return NextResponse.json({ links: linksWithDetail });
```

기존 `return NextResponse.json({ links });` 줄은 삭제.

- [ ] **Step 5: 테스트 재실행 — 통과 확인**

```bash
pnpm test tests/unit/git/links-get-with-detail.spec.ts
```

Expected: 3 tests passed

- [ ] **Step 6: 전체 테스트 확인 (기존 테스트 깨지지 않았는지)**

```bash
pnpm test
```

Expected: all tests pass

- [ ] **Step 7: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 8: 커밋**

```bash
git add src/app/api/git/links/route.ts tests/unit/git/links-get-with-detail.spec.ts
git commit -m "feat: /api/git/links GET에서 issueDetail 병렬 fetch 추가"
```

---

## Chunk 2: UI 레이어

### Task 5: `git-integration-section.tsx` — issueDetail 표시

**Files:**
- Modify: `src/components/ticket/git-integration-section.tsx`
- Test: `tests/unit/components/issue-detail-helpers.spec.ts`

- [ ] **Step 1: UI 헬퍼 함수 테스트 작성**

```typescript
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
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm test tests/unit/components/issue-detail-helpers.spec.ts
```

Expected: 모듈을 찾을 수 없음

- [ ] **Step 3: 헬퍼 함수 파일 생성**

```typescript
// src/components/ticket/issue-detail-helpers.ts

export function getStateBadgeClass(state: string): string {
  if (state === "open") return "bg-green-100 text-green-700";
  if (state === "closed") return "bg-purple-100 text-purple-700";
  return "bg-slate-100 text-slate-700";
}

/** hexColor: 6자리 hex (# 없음, 대소문자 무관) */
export function getLabelTextColor(hexColor: string): string {
  const hex = hexColor.replace(/^#/, "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 128 ? "#000000" : "#ffffff";
}

export function formatMilestone(milestone: {
  title: string;
  dueOn: string | null;
  openIssues: number;
  closedIssues: number;
}): string {
  const total = milestone.openIssues + milestone.closedIssues;
  if (total === 0) return milestone.title;
  return `${milestone.title} (${milestone.closedIssues}/${total} 완료)`;
}
```

- [ ] **Step 4: 테스트 재실행 — 통과 확인**

```bash
pnpm test tests/unit/components/issue-detail-helpers.spec.ts
```

Expected: 8 tests passed

- [ ] **Step 5: `git-integration-section.tsx` 수정**

파일 상단의 기존 React import 줄(`import { useMemo, useState } from "react"`)을 다음으로 **교체**한다 (merge — 기존 줄 삭제 후 대체):

```typescript
import { useEffect, useMemo, useState } from "react";
```

그 아래에 다음 import들을 **추가**한다:

```typescript
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import type { IssueDetail } from "@/lib/git/provider";
import { getStateBadgeClass, getLabelTextColor, formatMilestone } from "./issue-detail-helpers";
```

`GitLink` 타입에 `issueDetail` 추가:

```typescript
type GitLink = {
  id: string;
  provider: GitProvider;
  repoFullName: string;
  issueNumber: number;
  issueUrl: string;
  createdAt: Date;
  issueDetail?: IssueDetail | null;  // undefined=로딩중, null=실패
};
```

컴포넌트 내부 state 추가 (기존 state 선언부 아래):

```typescript
  const [issueDetails, setIssueDetails] = useState<Record<string, IssueDetail | null | undefined>>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
```

`useEffect` 추가 (기존 state 선언부 뒤):

```typescript
  useEffect(() => {
    if (linkedIssues.length === 0) return;

    setIsLoadingDetails(true);
    fetch(`/api/git/links?ticketId=${ticketId}`)
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data: { links: Array<{ id: string; issueDetail: IssueDetail | null }> }) => {
        const details: Record<string, IssueDetail | null> = {};
        for (const link of data.links) {
          details[link.id] = link.issueDetail;
        }
        setIssueDetails(details);
      })
      .catch(() => {
        // 전체 실패 시 모든 이슈를 null로
        const details: Record<string, null> = {};
        for (const link of linkedIssues) {
          details[link.id] = null;
        }
        setIssueDetails(details);
      })
      .finally(() => setIsLoadingDetails(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);
```

연결된 이슈 목록 렌더링 부분 (`linkedIssues.map(...)`)을 다음으로 교체:

```tsx
{linkedIssues.map((link) => {
  const detail = issueDetails[link.id];
  return (
    <li key={link.id} className="space-y-1.5 rounded-md border p-3 text-sm">
      {/* 헤더 행: 링크 + state 배지 + 연결 해제 버튼 */}
      <div className="flex items-center justify-between gap-3">
        <a href={link.issueUrl} target="_blank" rel="noreferrer" className="hover:underline font-medium">
          [{link.provider}] {link.repoFullName} #{link.issueNumber}
        </a>
        <div className="flex items-center gap-2 shrink-0">
          {detail !== undefined && detail !== null && (
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${getStateBadgeClass(detail.state)}`}>
              {detail.state}
            </span>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void unlinkIssue(link.id)}
          >
            연결 해제
          </Button>
        </div>
      </div>

      {/* 상세 정보 영역 */}
      {detail === undefined && isLoadingDetails && (
        <div className="space-y-1.5 pl-1">
          <div className="h-3 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
        </div>
      )}
      {detail === null && (
        <p className="pl-1 text-xs text-slate-400">이슈 정보를 불러올 수 없습니다.</p>
      )}
      {detail && (
        <div className="space-y-1 pl-1 text-xs text-slate-600">
          {detail.assignees.length > 0 && (
            <p>담당자: {detail.assignees.map((a) => a.login).join(", ")}</p>
          )}
          {detail.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {detail.labels.map((label) => (
                <span
                  key={label.name}
                  className="rounded px-1.5 py-0.5 text-xs"
                  style={{
                    backgroundColor: `#${label.color}`,
                    color: getLabelTextColor(label.color)
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
          {detail.milestone && (
            <p>마일스톤: {formatMilestone(detail.milestone)}</p>
          )}
          {detail.hasPR && <p>PR 연결됨</p>}
          <p className="text-slate-400">
            {formatDistanceToNow(new Date(detail.updatedAt), { addSuffix: true, locale: ko })} 업데이트
          </p>
        </div>
      )}
    </li>
  );
})}
```

또한 이슈 연결 해제 기능 `unlinkIssue` 함수 추가 (기존 `linkIssue` 함수 뒤):

```typescript
  const unlinkIssue = async (linkId: string) => {
    const response = await fetch(`/api/git/links?id=${linkId}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      toast.error(payload.error || "연결 해제에 실패했습니다.");
      return;
    }
    setLinkedIssues((prev) => prev.filter((l) => l.id !== linkId));
    setIssueDetails((prev) => {
      const next = { ...prev };
      delete next[linkId];
      return next;
    });
    toast.success("이슈 연결이 해제됐습니다.");
  };
```

> **참고:** 기존 코드에 `unlinkIssue`가 없었다면 이 함수가 처음 추가되는 것이다. 기존에 연결 해제 버튼이 없었으므로 이 Task에서 같이 추가한다.

- [ ] **Step 6: 빌드 확인 (lint + 타입)**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 7: 커밋**

```bash
git add src/components/ticket/git-integration-section.tsx \
        src/components/ticket/issue-detail-helpers.ts \
        tests/unit/components/issue-detail-helpers.spec.ts
git commit -m "feat: git-integration-section에 이슈 상세 인라인 표시 추가"
```

---

### Task 6: 상담원용 `linked-issues-readonly.tsx` + `ticket-detail.tsx` 업데이트

**Files:**
- Create: `src/components/ticket/linked-issues-readonly.tsx`
- Modify: `src/components/admin/ticket-detail.tsx`

- [ ] **Step 1: `linked-issues-readonly.tsx` 생성**

```tsx
// src/components/ticket/linked-issues-readonly.tsx
"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { IssueDetail } from "@/lib/git/provider";
import { getStateBadgeClass, getLabelTextColor, formatMilestone } from "./issue-detail-helpers";

type GitProvider = "GITHUB" | "GITLAB" | "CODECOMMIT";

type GitLink = {
  id: string;
  provider: GitProvider;
  repoFullName: string;
  issueNumber: number;
  issueUrl: string;
};

interface LinkedIssuesReadonlyProps {
  ticketId: string;
  initialLinks: GitLink[];
}

export function LinkedIssuesReadonly({ ticketId, initialLinks }: LinkedIssuesReadonlyProps) {
  const [issueDetails, setIssueDetails] = useState<Record<string, IssueDetail | null | undefined>>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    if (initialLinks.length === 0) return;

    setIsLoadingDetails(true);
    fetch(`/api/git/links?ticketId=${ticketId}`)
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data: { links: Array<{ id: string; issueDetail: IssueDetail | null }> }) => {
        const details: Record<string, IssueDetail | null> = {};
        for (const link of data.links) {
          details[link.id] = link.issueDetail;
        }
        setIssueDetails(details);
      })
      .catch(() => {
        const details: Record<string, null> = {};
        for (const link of initialLinks) {
          details[link.id] = null;
        }
        setIssueDetails(details);
      })
      .finally(() => setIsLoadingDetails(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  if (initialLinks.length === 0) return null;

  return (
    <section className="mt-8 space-y-4 border-t pt-8">
      <h3 className="text-lg font-medium">연결된 이슈</h3>
      <ul className="space-y-2">
        {initialLinks.map((link) => {
          const detail = issueDetails[link.id];
          return (
            <li key={link.id} className="space-y-1.5 rounded-md border p-3 text-sm">
              <div className="flex items-center gap-3">
                <a href={link.issueUrl} target="_blank" rel="noreferrer" className="hover:underline font-medium">
                  [{link.provider}] {link.repoFullName} #{link.issueNumber}
                </a>
                {detail !== undefined && detail !== null && (
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${getStateBadgeClass(detail.state)}`}>
                    {detail.state}
                  </span>
                )}
              </div>

              {detail === undefined && isLoadingDetails && (
                <div className="space-y-1.5 pl-1">
                  <div className="h-3 w-48 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
                </div>
              )}
              {detail === null && (
                <p className="pl-1 text-xs text-slate-400">이슈 정보를 불러올 수 없습니다.</p>
              )}
              {detail && (
                <div className="space-y-1 pl-1 text-xs text-slate-600">
                  {detail.assignees.length > 0 && (
                    <p>담당자: {detail.assignees.map((a) => a.login).join(", ")}</p>
                  )}
                  {detail.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {detail.labels.map((label) => (
                        <span
                          key={label.name}
                          className="rounded px-1.5 py-0.5 text-xs"
                          style={{
                            backgroundColor: `#${label.color}`,
                            color: getLabelTextColor(label.color)
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {detail.milestone && (
                    <p>마일스톤: {formatMilestone(detail.milestone)}</p>
                  )}
                  {detail.hasPR && <p>PR 연결됨</p>}
                  <p className="text-slate-400">
                    {formatDistanceToNow(new Date(detail.updatedAt), { addSuffix: true, locale: ko })} 업데이트
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: `ticket-detail.tsx` 수정 — `isAdmin` 기반 조건부 렌더링**

파일 상단 import에 추가:

```typescript
import { LinkedIssuesReadonly } from "@/components/ticket/linked-issues-readonly";
```

파일 하단의 `<GitIntegrationSection ... />` 부분을 다음으로 교체:

```tsx
      {isAdmin ? (
        <GitIntegrationSection
          ticketId={ticket.id}
          ticketNumber={ticket.ticketNumber}
          ticketSubject={ticket.subject}
          ticketDescription={ticket.description}
          initialLinks={ticket.gitLinks || []}
        />
      ) : canEdit ? (
        // canEdit = ticket.assigneeId === currentAgentId (배정된 상담원만)
        // 배정되지 않은 상담원은 여기서 null → Git 섹션 미표시 (AC #6)
        <LinkedIssuesReadonly
          ticketId={ticket.id}
          initialLinks={ticket.gitLinks || []}
        />
      ) : null}
```

- [ ] **Step 3: 타입 체크 및 빌드 확인**

```bash
pnpm exec tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 개발 서버 실행 후 브라우저에서 수동 확인**

```bash
pnpm dev
```

확인 항목:
1. 어드민 계정으로 티켓 상세 접근 → Git 연동 섹션(검색/생성 포함) + 이슈 상세 표시
2. 상담원 계정으로 **배정된** 티켓 상세 접근 → "연결된 이슈" 섹션(읽기 전용, 연결 해제 버튼 없음) + 이슈 상세 표시
3. 상담원 계정으로 **미배정** 티켓 접근 → Git 관련 섹션 전혀 미표시 (canEdit === false → null 렌더링)
4. 이슈 상세 로딩 중 스켈레톤 표시 확인 (Network 탭에서 slow 3G 설정)

- [ ] **Step 5: 전체 테스트 통과 확인**

```bash
pnpm test
```

Expected: all tests pass

- [ ] **Step 6: 최종 커밋**

```bash
git add src/components/ticket/linked-issues-readonly.tsx \
        src/components/admin/ticket-detail.tsx
git commit -m "feat: 상담원용 이슈 상세 읽기 전용 컴포넌트 및 조건부 렌더링 추가"
```
