# GitHub 이슈 상세 확장 (코멘트·PR·아코디언) 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 티켓 상세 화면의 연결된 이슈 목록에 아코디언 UI를 추가하고, 클릭 시 코멘트(처음 3개)·연결된 PR 상세(제목/상태/브랜치/리뷰 상태)를 on-demand로 로딩해 표시한다.

**Architecture:** 새 엔드포인트 `GET /api/git/issue-detail`(ticketId + linkId 파라미터)가 GitHub/GitLab에서 full detail을 fetch해 반환한다. 프론트엔드는 아코디언 클릭 시 이 엔드포인트를 호출하고, 한 번 로딩한 결과는 컴포넌트 상태에 캐시한다. 기존 페이지 로드 시 basic issueDetails fetch는 유지되어 접힌 상태 배지를 제공한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma/SQLite, Vitest, Tailwind CSS, date-fns

---

## Chunk 1: 데이터 레이어

### Task 1: `IssueComment` · `LinkedPR` · `IssueFullDetail` 타입 + 인터페이스 추가

**Files:**
- Modify: `src/lib/git/provider.ts`
- Test: `tests/unit/git/provider-full-detail-types.spec.ts`

- [ ] **Step 1: 테스트 파일 생성**

```typescript
// tests/unit/git/provider-full-detail-types.spec.ts
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
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm test tests/unit/git/provider-full-detail-types.spec.ts
```

Expected: 타입 import 에러

- [ ] **Step 3: `src/lib/git/provider.ts` 수정**

기존 `IssueDetail` 인터페이스 뒤에 추가:

```typescript
export interface IssueComment {
  id: number;
  author: { login: string; avatarUrl: string };
  body: string;
  createdAt: string;  // ISO 8601
}

export interface LinkedPR {
  number: number;
  title: string;
  state: 'open' | 'merged' | 'closed';
  headBranch: string;
  baseBranch: string;
  reviewDecision: 'approved' | 'changes_requested' | 'review_required' | null;
  isDraft: boolean;
  url: string;
}

export interface IssueFullDetail extends IssueDetail {
  comments: IssueComment[];   // 처음 3개만
  commentCount: number;       // 전체 코멘트 수
  linkedPRs: LinkedPR[];
  // issueUrl은 포함하지 않음 — UI는 GitLink.issueUrl(DB)을 사용
}
```

기존 `GitIssueProvider` 인터페이스에 `getIssueFullDetail?` 추가 — 기존 인터페이스를 다음으로 교체:

```typescript
export interface GitIssueProvider {
  readonly provider: GitProvider;
  searchIssues(input: SearchIssuesInput): Promise<GitIssueSummary[]>;
  createIssue(input: CreateIssueInput): Promise<GitIssueSummary>;
  getIssue?(repoFullName: string, issueNumber: number, signal?: AbortSignal): Promise<IssueDetail>;
  getIssueFullDetail?(repoFullName: string, issueNumber: number, signal?: AbortSignal): Promise<IssueFullDetail>;
}
```

- [ ] **Step 4: 테스트 재실행 — 통과 확인**

```bash
pnpm test tests/unit/git/provider-full-detail-types.spec.ts
```

Expected: 3 tests passed

- [ ] **Step 5: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 6: 커밋**

```bash
git add src/lib/git/provider.ts tests/unit/git/provider-full-detail-types.spec.ts
git commit -m "feat: IssueComment, LinkedPR, IssueFullDetail 타입 추가"
```

---

### Task 2: `GitHubProvider.getIssueFullDetail()` 구현

**Files:**
- Modify: `src/lib/git/providers/github.ts`
- Test: `tests/unit/git/github-provider-full-detail.spec.ts`

- [ ] **Step 1: 테스트 파일 생성**

```typescript
// tests/unit/git/github-provider-full-detail.spec.ts
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
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm test tests/unit/git/github-provider-full-detail.spec.ts
```

Expected: `provider.getIssueFullDetail is not a function`

- [ ] **Step 3: `src/lib/git/providers/github.ts` 수정**

파일 상단 import에 `IssueFullDetail`, `IssueComment`, `LinkedPR` 추가:

```typescript
import {
  type CreateIssueInput,
  type GitIssueProvider,
  type GitIssueSummary,
  type IssueComment,
  type IssueDetail,
  type IssueFullDetail,
  type LinkedPR,
  type SearchIssuesInput,
  resolveLimit,
  validateRepoFullName
} from "@/lib/git/provider";
```

`getIssue()` 메서드 뒤에 다음 모듈 레벨 함수와 메서드를 추가:

```typescript
// 파일 최상단 (클래스 밖, import 아래)에 helper 추가
function computeReviewDecision(
  reviews: Array<{ user: { login: string }; state: string }>,
  requestedReviewerCount: number
): LinkedPR['reviewDecision'] {
  // 리뷰어별 최신 상태 추출 (DISMISSED 제외)
  const latestByReviewer = new Map<string, string>();
  for (const review of reviews) {
    if (review.state !== 'DISMISSED') {
      latestByReviewer.set(review.user.login, review.state);
    }
  }
  const states = [...latestByReviewer.values()];
  if (states.some(s => s === 'CHANGES_REQUESTED')) return 'changes_requested';
  if (states.length > 0 && states.every(s => s === 'APPROVED')) return 'approved';
  if (requestedReviewerCount > 0) return 'review_required';
  return null;
}
```

`GitHubProvider` 클래스에 `getIssueFullDetail()` 메서드 추가 (`getIssue()` 뒤에):

```typescript
  async getIssueFullDetail(
    repoFullName: string,
    issueNumber: number,
    signal?: AbortSignal
  ): Promise<IssueFullDetail> {
    const repo = validateRepoFullName(repoFullName);
    const base = `${GITHUB_API_BASE}/repos/${repo}`;

    // Round 1: 병렬 fetch
    const [issueRes, commentsRes, timelineRes] = await Promise.all([
      fetch(`${base}/issues/${issueNumber}`, { headers: this.getHeaders(), signal }),
      fetch(`${base}/issues/${issueNumber}/comments?per_page=3`, { headers: this.getHeaders(), signal }),
      fetch(`${base}/issues/${issueNumber}/timeline`, {
        headers: {
          ...this.getHeaders(),
          Accept: "application/vnd.github.mockingbird-preview+json"
        },
        signal
      })
    ]);

    if (!issueRes.ok) {
      throw new Error(`GitHub getIssueFullDetail issue failed: ${issueRes.status}`);
    }

    type IssueResponse = {
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
      comments: number;
    };
    type CommentResponse = Array<{
      id: number;
      user: { login: string; avatar_url: string };
      body: string;
      created_at: string;
    }>;
    type TimelineEvent = {
      event: string;
      source?: {
        type: string;
        issue?: { number: number; pull_request?: unknown };
      };
    };

    const issueData = (await issueRes.json()) as IssueResponse;
    const commentsData: CommentResponse = commentsRes.ok ? (await commentsRes.json()) as CommentResponse : [];
    const timelineData: TimelineEvent[] = timelineRes.ok ? (await timelineRes.json()) as TimelineEvent[] : [];

    // timeline에서 PR 번호 추출
    const prNumbers = [
      ...new Set(
        timelineData
          .filter(
            e =>
              e.event === "cross_referenced" &&
              e.source?.type === "issue" &&
              e.source.issue?.pull_request !== undefined
          )
          .map(e => e.source!.issue!.number)
      )
    ];

    // Round 2: PR 상세 병렬 fetch
    let linkedPRs: LinkedPR[] = [];
    if (prNumbers.length > 0) {
      const prResults = await Promise.allSettled(
        prNumbers.map(async (prNumber) => {
          const [prRes, reviewsRes] = await Promise.all([
            fetch(`${base}/pulls/${prNumber}`, { headers: this.getHeaders(), signal }),
            fetch(`${base}/pulls/${prNumber}/reviews`, { headers: this.getHeaders(), signal })
          ]);

          if (!prRes.ok) throw new Error(`PR ${prNumber} fetch failed`);

          type PRResponse = {
            number: number;
            title: string;
            state: string;
            merged_at: string | null;
            head: { ref: string };
            base: { ref: string };
            draft: boolean;
            html_url: string;
            requested_reviewers: Array<unknown>;
          };
          const pr = (await prRes.json()) as PRResponse;

          type ReviewResponse = Array<{ user: { login: string }; state: string }>;
          const reviews: ReviewResponse = reviewsRes.ok
            ? ((await reviewsRes.json()) as ReviewResponse)
            : [];

          // state 정규화
          let state: LinkedPR['state'];
          if (pr.state === 'closed' && pr.merged_at !== null) state = 'merged';
          else if (pr.state === 'closed') state = 'closed';
          else state = 'open';

          return {
            number: pr.number,
            title: pr.title,
            state,
            headBranch: pr.head.ref,
            baseBranch: pr.base.ref,
            reviewDecision: computeReviewDecision(reviews, pr.requested_reviewers.length),
            isDraft: pr.draft,
            url: pr.html_url
          } satisfies LinkedPR;
        })
      );

      linkedPRs = prResults
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<LinkedPR>).value);
    }

    return {
      state: issueData.state,
      assignees: issueData.assignees.map(a => ({ login: a.login, avatarUrl: a.avatar_url })),
      labels: issueData.labels,
      milestone: issueData.milestone
        ? {
            title: issueData.milestone.title,
            dueOn: issueData.milestone.due_on,
            openIssues: issueData.milestone.open_issues,
            closedIssues: issueData.milestone.closed_issues
          }
        : null,
      hasPR: linkedPRs.length > 0,
      updatedAt: issueData.updated_at,
      comments: commentsData.map(c => ({
        id: c.id,
        author: { login: c.user.login, avatarUrl: c.user.avatar_url },
        body: c.body,
        createdAt: c.created_at
      })),
      commentCount: issueData.comments,
      linkedPRs
    };
  }
```

- [ ] **Step 4: 테스트 재실행 — 통과 확인**

```bash
pnpm test tests/unit/git/github-provider-full-detail.spec.ts
```

Expected: 8 tests passed

- [ ] **Step 5: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 6: 커밋**

```bash
git add src/lib/git/providers/github.ts tests/unit/git/github-provider-full-detail.spec.ts
git commit -m "feat: GitHubProvider.getIssueFullDetail() 구현 (코멘트 + PR + 리뷰 상태)"
```

---

### Task 3: `GitLabProvider.getIssueFullDetail()` 구현

**Files:**
- Modify: `src/lib/git/providers/gitlab.ts`
- Test: `tests/unit/git/gitlab-provider-full-detail.spec.ts`

- [ ] **Step 1: 테스트 파일 생성**

```typescript
// tests/unit/git/gitlab-provider-full-detail.spec.ts
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
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm test tests/unit/git/gitlab-provider-full-detail.spec.ts
```

- [ ] **Step 3: `src/lib/git/providers/gitlab.ts` 수정**

파일 상단 import에 `IssueComment`, `IssueFullDetail`, `LinkedPR` 추가:

```typescript
import {
  type CreateIssueInput,
  type GitIssueProvider,
  type GitIssueSummary,
  type IssueComment,
  type IssueDetail,
  type IssueFullDetail,
  type LinkedPR,
  type SearchIssuesInput,
  resolveLimit,
  validateRepoFullName
} from "@/lib/git/provider";
```

`getIssue()` 메서드 뒤에 추가:

```typescript
  async getIssueFullDetail(
    repoFullName: string,
    issueNumber: number,
    signal?: AbortSignal
  ): Promise<IssueFullDetail> {
    const repoPath = validateRepoFullName(repoFullName);
    const projectPath = encodeURIComponent(repoPath);
    const base = `${GITLAB_API_BASE}/projects/${projectPath}`;

    const [issueRes, notesRes, mrsRes] = await Promise.all([
      fetch(`${base}/issues/${issueNumber}`, { headers: this.getHeaders(), signal }),
      fetch(`${base}/issues/${issueNumber}/notes?per_page=3&sort=asc&order_by=created_at`, { headers: this.getHeaders(), signal }),
      fetch(`${base}/issues/${issueNumber}/related_merge_requests`, { headers: this.getHeaders(), signal })
    ]);

    if (!issueRes.ok) {
      throw new Error(`GitLab getIssueFullDetail issue failed: ${issueRes.status}`);
    }

    type GitLabIssueResponse = {
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
      user_notes_count: number;
    };
    type GitLabNote = {
      id: number;
      author: { username: string; avatar_url: string };
      body: string;
      created_at: string;
      system: boolean;
    };
    type GitLabMR = {
      iid: number;
      title: string;
      state: string;
      source_branch: string;
      target_branch: string;
      draft: boolean;
      web_url: string;
    };

    const issueData = (await issueRes.json()) as GitLabIssueResponse;

    let comments: IssueComment[] = [];
    if (notesRes.ok) {
      const notesData = (await notesRes.json()) as GitLabNote[];
      comments = notesData
        .filter(n => !n.system)
        .map(n => ({
          id: n.id,
          author: { login: n.author.username, avatarUrl: n.author.avatar_url },
          body: n.body,
          createdAt: n.created_at
        }));
    }

    let linkedPRs: LinkedPR[] = [];
    if (mrsRes.ok) {
      const mrsData = (await mrsRes.json()) as GitLabMR[];
      linkedPRs = mrsData.map(mr => {
        let state: LinkedPR['state'];
        if (mr.state === 'merged') state = 'merged';
        else if (mr.state === 'closed') state = 'closed';
        else state = 'open'; // 'opened' → 'open'

        return {
          number: mr.iid,
          title: mr.title,
          state,
          headBranch: mr.source_branch,
          baseBranch: mr.target_branch,
          reviewDecision: null, // GitLab 기본 API로는 판단 불가
          isDraft: mr.draft,
          url: mr.web_url
        };
      });
    }

    return {
      state: issueData.state,
      assignees: issueData.assignees.map(a => ({ login: a.username, avatarUrl: a.avatar_url })),
      labels: issueData.labels.map(name => ({ name, color: "000000" })),
      milestone: issueData.milestone
        ? {
            title: issueData.milestone.title,
            dueOn: issueData.milestone.due_date,
            openIssues: issueData.milestone.open_issues_count,
            closedIssues: issueData.milestone.closed_issues_count
          }
        : null,
      hasPR: linkedPRs.length > 0,
      updatedAt: issueData.updated_at,
      comments,
      commentCount: issueData.user_notes_count,
      linkedPRs
    };
  }
```

- [ ] **Step 4: 테스트 재실행 — 통과 확인**

```bash
pnpm test tests/unit/git/gitlab-provider-full-detail.spec.ts
```

Expected: 5 tests passed

- [ ] **Step 5: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 6: 커밋**

```bash
git add src/lib/git/providers/gitlab.ts tests/unit/git/gitlab-provider-full-detail.spec.ts
git commit -m "feat: GitLabProvider.getIssueFullDetail() 구현 (코멘트 + MR)"
```

---

### Task 4: 새 엔드포인트 `GET /api/git/issue-detail`

**Files:**
- Create: `src/app/api/git/issue-detail/route.ts`
- Test: `tests/unit/git/issue-detail-route.spec.ts`

- [ ] **Step 1: 테스트 파일 생성**

```typescript
// tests/unit/git/issue-detail-route.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/git/issue-detail/route";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "ADMIN", agentId: "agent-1" }
  })
}));

const mockLink = vi.fn();
const mockCredential = vi.fn();

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

const mockGetIssueFullDetail = vi.fn();
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
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm test tests/unit/git/issue-detail-route.spec.ts
```

Expected: 모듈을 찾을 수 없음

- [ ] **Step 3: `src/app/api/git/issue-detail/route.ts` 생성**

```typescript
// src/app/api/git/issue-detail/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { decryptToken } from "@/lib/crypto/encrypt";
import type { IssueFullDetail } from "@/lib/git/provider";
import { GitHubProvider } from "@/lib/git/providers/github";
import { GitLabProvider } from "@/lib/git/providers/gitlab";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticketId = request.nextUrl.searchParams.get("ticketId");
    const linkId = request.nextUrl.searchParams.get("linkId");

    if (!ticketId || !linkId) {
      return NextResponse.json(
        { error: "ticketId와 linkId는 필수입니다." },
        { status: 400 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";
    const agentId = session.user.agentId;

    // 비관리자 권한 확인
    if (!isAdmin) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { assigneeId: true }
      });

      if (!ticket || ticket.assigneeId !== agentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // link 조회 및 ticketId 소유권 확인
    const link = await prisma.gitLink.findUnique({
      where: { id: linkId },
      select: { ticketId: true, provider: true, repoFullName: true, issueNumber: true }
    });

    if (!link || link.ticketId !== ticketId) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // provider credential 조회
    const credential = await prisma.gitProviderCredential.findUnique({
      where: { provider: link.provider },
      select: { encryptedToken: true }
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Provider credential not configured" },
        { status: 500 }
      );
    }

    const token = decryptToken(credential.encryptedToken);

    // provider 인스턴스 생성
    type FullDetailProvider = {
      getIssueFullDetail?: (
        repo: string,
        num: number,
        signal?: AbortSignal
      ) => Promise<IssueFullDetail>;
    };

    let provider: FullDetailProvider | null = null;
    if (link.provider === "GITHUB") provider = new GitHubProvider(token);
    else if (link.provider === "GITLAB") provider = new GitLabProvider(token);

    if (!provider?.getIssueFullDetail) {
      return NextResponse.json(
        { error: "이 provider는 상세 정보를 지원하지 않습니다." },
        { status: 404 }
      );
    }

    // 5초 타임아웃
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const detail = await provider.getIssueFullDetail(
        link.repoFullName,
        link.issueNumber,
        controller.signal
      );
      return NextResponse.json({ detail });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.error("GET /api/git/issue-detail error:", error);
    return NextResponse.json(
      { error: "이슈 상세 정보를 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: 테스트 재실행 — 통과 확인**

```bash
pnpm test tests/unit/git/issue-detail-route.spec.ts
```

Expected: 5 tests passed

- [ ] **Step 5: 전체 유닛 테스트 통과 확인**

```bash
pnpm test tests/unit
```

Expected: all pass

- [ ] **Step 6: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 7: 커밋**

```bash
git add src/app/api/git/issue-detail/route.ts tests/unit/git/issue-detail-route.spec.ts
git commit -m "feat: GET /api/git/issue-detail 엔드포인트 추가 (5초 타임아웃)"
```

---

## Chunk 2: UI 레이어

### Task 5: 헬퍼 함수 추가 + 테스트

**Files:**
- Modify: `src/components/ticket/issue-detail-helpers.ts`
- Modify: `tests/unit/components/issue-detail-helpers.spec.ts`

- [ ] **Step 1: 기존 테스트 파일에 테스트 추가**

`tests/unit/components/issue-detail-helpers.spec.ts`의 기존 내용 뒤에 다음을 추가:

기존 파일의 import 줄(1번째 줄)을 다음으로 수정한다:

```typescript
import {
  getStateBadgeClass,
  getLabelTextColor,
  formatMilestone,
  getPRStateBadgeClass,
  getReviewDecisionText
} from "@/components/ticket/issue-detail-helpers";
```

그 다음, 파일 **끝**에 다음 `describe` 블록들을 추가한다:

```typescript
describe("getPRStateBadgeClass", () => {
  it("open → blue 클래스 반환", () => {
    expect(getPRStateBadgeClass("open")).toBe("bg-blue-100 text-blue-700");
  });

  it("merged → purple 클래스 반환", () => {
    expect(getPRStateBadgeClass("merged")).toBe("bg-purple-100 text-purple-700");
  });

  it("closed → slate 클래스 반환", () => {
    expect(getPRStateBadgeClass("closed")).toBe("bg-slate-100 text-slate-500");
  });
});

describe("getReviewDecisionText", () => {
  it("approved → '✓ approved'", () => {
    expect(getReviewDecisionText("approved")).toBe("✓ approved");
  });

  it("changes_requested → '✗ changes requested'", () => {
    expect(getReviewDecisionText("changes_requested")).toBe("✗ changes requested");
  });

  it("review_required → '○ review required'", () => {
    expect(getReviewDecisionText("review_required")).toBe("○ review required");
  });

  it("null → null 반환", () => {
    expect(getReviewDecisionText(null)).toBeNull();
  });
});
```

> **Note:** 파일 상단 import에 `getPRStateBadgeClass`, `getReviewDecisionText`를 추가해야 함. 기존 import 줄을 수정한다.

- [ ] **Step 2: 테스트 실행 — 신규 테스트 실패 확인**

```bash
pnpm test tests/unit/components/issue-detail-helpers.spec.ts
```

Expected: 기존 테스트 pass, 신규 2개 describe 실패 (함수 없음)

- [ ] **Step 3: `src/components/ticket/issue-detail-helpers.ts` 수정**

파일 끝에 다음 함수들을 추가:

```typescript
export function getPRStateBadgeClass(state: 'open' | 'merged' | 'closed'): string {
  if (state === 'open') return 'bg-blue-100 text-blue-700';
  if (state === 'merged') return 'bg-purple-100 text-purple-700';
  return 'bg-slate-100 text-slate-500';
}

export function getReviewDecisionText(
  decision: 'approved' | 'changes_requested' | 'review_required' | null
): string | null {
  if (decision === 'approved') return '✓ approved';
  if (decision === 'changes_requested') return '✗ changes requested';
  if (decision === 'review_required') return '○ review required';
  return null;
}
```

- [ ] **Step 4: 테스트 재실행 — 전체 통과 확인**

```bash
pnpm test tests/unit/components/issue-detail-helpers.spec.ts
```

Expected: 17 tests passed (기존 10 + 신규 7)

- [ ] **Step 5: 커밋**

```bash
git add src/components/ticket/issue-detail-helpers.ts tests/unit/components/issue-detail-helpers.spec.ts
git commit -m "feat: getPRStateBadgeClass, getReviewDecisionText 헬퍼 함수 추가"
```

---

### Task 6: `git-integration-section.tsx` — 아코디언 + on-demand 로딩

**Files:**
- Modify: `src/components/ticket/git-integration-section.tsx`

- [ ] **Step 1: import 수정**

파일 상단의 기존 import 줄을 다음으로 교체/추가:

```typescript
// 기존 줄 교체:
// import type { IssueDetail, GitProvider } from "@/lib/git/provider";
// →
import type { IssueDetail, IssueFullDetail, GitProvider } from "@/lib/git/provider";

// 기존 줄 교체:
// import { getStateBadgeClass, getLabelTextColor, formatMilestone } from "./issue-detail-helpers";
// →
import {
  getStateBadgeClass,
  getLabelTextColor,
  formatMilestone,
  getPRStateBadgeClass,
  getReviewDecisionText
} from "./issue-detail-helpers";
```

- [ ] **Step 2: 컴포넌트 상태에 `expandedIssues`, `fullDetails` 추가**

기존 state 선언부 (`isLoadingDetails`, `detailFetchTrigger` 뒤에) 추가:

```typescript
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [fullDetails, setFullDetails] = useState<Record<string, IssueFullDetail | null | undefined>>({});
```

- [ ] **Step 3: `toggleExpand` 함수 추가**

`unlinkIssue` 함수 뒤에 추가:

```typescript
  const toggleExpand = async (link: (typeof linkedIssues)[number]) => {
    const isExpanding = !expandedIssues.has(link.id);

    setExpandedIssues((prev) => {
      const next = new Set(prev);
      if (isExpanding) next.add(link.id);
      else next.delete(link.id);
      return next;
    });

    if (isExpanding && fullDetails[link.id] === undefined) {
      const params = new URLSearchParams({ ticketId, linkId: link.id });
      try {
        const res = await fetch(`/api/git/issue-detail?${params.toString()}`);
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { detail: IssueFullDetail };
        setFullDetails((prev) => ({ ...prev, [link.id]: data.detail }));
      } catch {
        setFullDetails((prev) => ({ ...prev, [link.id]: null }));
      }
    }
  };
```

- [ ] **Step 4: `unlinkIssue`에 `fullDetails` 정리 추가**

기존 `unlinkIssue` 내부에서 `setIssueDetails(...)` 뒤에 추가:

```typescript
    setFullDetails((prev) => {
      const next = { ...prev };
      delete next[linkId];
      return next;
    });
    setExpandedIssues((prev) => {
      const next = new Set(prev);
      next.delete(linkId);
      return next;
    });
```

- [ ] **Step 5: 연결된 이슈 목록 렌더링 교체**

기존 `linkedIssues.map((link) => { ... })` 전체 블록을 다음으로 교체:

```tsx
{linkedIssues.map((link) => {
  const basicDetail = issueDetails[link.id];
  const fullDetail = fullDetails[link.id];
  const isExpanded = expandedIssues.has(link.id);
  const isLoadingFull = isExpanded && fullDetail === undefined;

  return (
    <li key={link.id} className="rounded-md border text-sm overflow-hidden">
      {/* 접힌 헤더 행 */}
      <div
        className="flex items-center justify-between gap-3 p-3 cursor-pointer select-none hover:bg-slate-50"
        onClick={() => void toggleExpand(link)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-400 text-xs shrink-0">{isExpanded ? "▼" : "▶"}</span>
          <a
            href={link.issueUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:underline font-medium truncate"
            onClick={(e) => e.stopPropagation()}
          >
            [{link.provider}] {link.repoFullName} #{link.issueNumber}
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {basicDetail != null && (
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${getStateBadgeClass(basicDetail.state)}`}>
              {basicDetail.state}
            </span>
          )}
          {fullDetail != null && fullDetail.linkedPRs.length > 0 && (
            <span className="bg-purple-100 text-purple-700 rounded px-2 py-0.5 text-xs font-medium">
              PR {fullDetail.linkedPRs.length}
            </span>
          )}
          {fullDetail != null && (
            <span className="text-xs text-slate-500">💬 {fullDetail.commentCount}</span>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              void unlinkIssue(link.id);
            }}
          >
            연결 해제
          </Button>
        </div>
      </div>

      {/* 펼친 상세 영역 */}
      {isExpanded && (
        <div className="border-t p-3 space-y-3 bg-slate-50/50">
          {isLoadingFull && (
            <div className="space-y-2">
              <div className="h-3 w-48 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-64 animate-pulse rounded bg-slate-200" />
            </div>
          )}
          {fullDetail === null && (
            <p className="text-xs text-slate-400">상세 정보를 불러올 수 없습니다.</p>
          )}
          {fullDetail && (
            <div className="space-y-3 text-xs text-slate-600">
              {/* 기본 정보 */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                {fullDetail.assignees.length > 0 && (
                  <span>담당자: {fullDetail.assignees.map((a) => a.login).join(", ")}</span>
                )}
                {fullDetail.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {fullDetail.labels.map((label) => (
                      <span
                        key={label.name}
                        className="rounded px-1.5 py-0.5"
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
                {fullDetail.milestone && (
                  <span>마일스톤: {formatMilestone(fullDetail.milestone)}</span>
                )}
                <span className="text-slate-400 ml-auto">
                  {formatDistanceToNow(new Date(fullDetail.updatedAt), { addSuffix: true, locale: ko })} 업데이트
                </span>
              </div>

              {/* PR 섹션 */}
              {fullDetail.linkedPRs.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">연결된 Pull Request</p>
                  {fullDetail.linkedPRs.map((pr) => {
                    const reviewText = getReviewDecisionText(pr.reviewDecision);
                    return (
                      <div key={pr.number} className="border rounded-md p-2 bg-white space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`rounded px-1.5 py-0.5 text-xs font-medium shrink-0 ${getPRStateBadgeClass(pr.state)}`}>
                              {pr.state}
                            </span>
                            <span className="font-medium truncate">
                              #{pr.number} — {pr.title}
                            </span>
                            {pr.isDraft && <span className="text-slate-400 shrink-0">[Draft]</span>}
                          </div>
                          <a
                            href={pr.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline shrink-0"
                          >
                            GitHub →
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <code className="bg-slate-100 px-1 rounded">{pr.headBranch}</code>
                          <span>→</span>
                          <code className="bg-slate-100 px-1 rounded">{pr.baseBranch}</code>
                          {reviewText && (
                            <span
                              className={
                                pr.reviewDecision === "approved"
                                  ? "text-green-600"
                                  : pr.reviewDecision === "changes_requested"
                                  ? "text-red-600"
                                  : "text-slate-500"
                              }
                            >
                              {reviewText}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 코멘트 섹션 */}
              {fullDetail.comments.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">코멘트</p>
                  {fullDetail.comments.map((comment) => (
                    <div key={comment.id} className="border rounded-md p-2 bg-white space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{comment.author.login}</span>
                        <span className="text-slate-400">
                          · {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ko })}
                        </span>
                      </div>
                      <p className="text-slate-600 line-clamp-3 whitespace-pre-wrap">{comment.body}</p>
                    </div>
                  ))}
                  {fullDetail.commentCount > fullDetail.comments.length && (
                    <a
                      href={link.issueUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline text-xs block text-right"
                    >
                      GitHub에서 전체 보기 ({fullDetail.commentCount}개) →
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
})}
```

- [ ] **Step 6: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 7: 전체 유닛 테스트 통과 확인**

```bash
pnpm test tests/unit
```

- [ ] **Step 8: 커밋**

```bash
git add src/components/ticket/git-integration-section.tsx
git commit -m "feat: git-integration-section 아코디언 + on-demand 이슈 상세 로딩"
```

---

### Task 7: `linked-issues-readonly.tsx` — 동일한 아코디언 적용

**Files:**
- Modify: `src/components/ticket/linked-issues-readonly.tsx`

- [ ] **Step 1: import 수정**

기존 `import type { IssueDetail, GitProvider } from "@/lib/git/provider"` 줄을 교체:

```typescript
import type { IssueDetail, IssueFullDetail, GitProvider } from "@/lib/git/provider";
```

기존 `import { getStateBadgeClass, getLabelTextColor, formatMilestone } from "./issue-detail-helpers"` 줄을 교체:

```typescript
import {
  getStateBadgeClass,
  getLabelTextColor,
  formatMilestone,
  getPRStateBadgeClass,
  getReviewDecisionText
} from "./issue-detail-helpers";
```

- [ ] **Step 2: 상태 추가**

기존 state 선언부(`isLoadingDetails` 뒤에) 추가:

```typescript
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [fullDetails, setFullDetails] = useState<Record<string, IssueFullDetail | null | undefined>>({});
```

- [ ] **Step 3: `toggleExpand` 함수 추가**

`return` 문 바로 위에 추가:

```typescript
  const toggleExpand = async (link: GitLink) => {
    const isExpanding = !expandedIssues.has(link.id);

    setExpandedIssues((prev) => {
      const next = new Set(prev);
      if (isExpanding) next.add(link.id);
      else next.delete(link.id);
      return next;
    });

    if (isExpanding && fullDetails[link.id] === undefined) {
      const params = new URLSearchParams({ ticketId, linkId: link.id });
      try {
        const res = await fetch(`/api/git/issue-detail?${params.toString()}`);
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { detail: IssueFullDetail };
        setFullDetails((prev) => ({ ...prev, [link.id]: data.detail }));
      } catch {
        setFullDetails((prev) => ({ ...prev, [link.id]: null }));
      }
    }
  };
```

- [ ] **Step 4: 이슈 목록 렌더링 교체**

기존 `initialLinks.map((link) => { ... })` 전체 블록을 다음으로 교체 (Task 6과 동일하지만 `unlinkIssue` 관련 코드 없음):

```tsx
{initialLinks.map((link) => {
  const basicDetail = issueDetails[link.id];
  const fullDetail = fullDetails[link.id];
  const isExpanded = expandedIssues.has(link.id);
  const isLoadingFull = isExpanded && fullDetail === undefined;

  return (
    <li key={link.id} className="rounded-md border text-sm overflow-hidden">
      {/* 접힌 헤더 행 */}
      <div
        className="flex items-center justify-between gap-3 p-3 cursor-pointer select-none hover:bg-slate-50"
        onClick={() => void toggleExpand(link)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-400 text-xs shrink-0">{isExpanded ? "▼" : "▶"}</span>
          <a
            href={link.issueUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:underline font-medium truncate"
            onClick={(e) => e.stopPropagation()}
          >
            [{link.provider}] {link.repoFullName} #{link.issueNumber}
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {basicDetail != null && (
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${getStateBadgeClass(basicDetail.state)}`}>
              {basicDetail.state}
            </span>
          )}
          {fullDetail != null && fullDetail.linkedPRs.length > 0 && (
            <span className="bg-purple-100 text-purple-700 rounded px-2 py-0.5 text-xs font-medium">
              PR {fullDetail.linkedPRs.length}
            </span>
          )}
          {fullDetail != null && (
            <span className="text-xs text-slate-500">💬 {fullDetail.commentCount}</span>
          )}
        </div>
      </div>

      {/* 펼친 상세 영역 */}
      {isExpanded && (
        <div className="border-t p-3 space-y-3 bg-slate-50/50">
          {isLoadingFull && (
            <div className="space-y-2">
              <div className="h-3 w-48 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-64 animate-pulse rounded bg-slate-200" />
            </div>
          )}
          {fullDetail === null && (
            <p className="text-xs text-slate-400">상세 정보를 불러올 수 없습니다.</p>
          )}
          {fullDetail && (
            <div className="space-y-3 text-xs text-slate-600">
              {/* 기본 정보 */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                {fullDetail.assignees.length > 0 && (
                  <span>담당자: {fullDetail.assignees.map((a) => a.login).join(", ")}</span>
                )}
                {fullDetail.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {fullDetail.labels.map((label) => (
                      <span
                        key={label.name}
                        className="rounded px-1.5 py-0.5"
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
                {fullDetail.milestone && (
                  <span>마일스톤: {formatMilestone(fullDetail.milestone)}</span>
                )}
                <span className="text-slate-400 ml-auto">
                  {formatDistanceToNow(new Date(fullDetail.updatedAt), { addSuffix: true, locale: ko })} 업데이트
                </span>
              </div>

              {/* PR 섹션 */}
              {fullDetail.linkedPRs.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">연결된 Pull Request</p>
                  {fullDetail.linkedPRs.map((pr) => {
                    const reviewText = getReviewDecisionText(pr.reviewDecision);
                    return (
                      <div key={pr.number} className="border rounded-md p-2 bg-white space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`rounded px-1.5 py-0.5 text-xs font-medium shrink-0 ${getPRStateBadgeClass(pr.state)}`}>
                              {pr.state}
                            </span>
                            <span className="font-medium truncate">
                              #{pr.number} — {pr.title}
                            </span>
                            {pr.isDraft && <span className="text-slate-400 shrink-0">[Draft]</span>}
                          </div>
                          <a
                            href={pr.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline shrink-0"
                          >
                            GitHub →
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <code className="bg-slate-100 px-1 rounded">{pr.headBranch}</code>
                          <span>→</span>
                          <code className="bg-slate-100 px-1 rounded">{pr.baseBranch}</code>
                          {reviewText && (
                            <span
                              className={
                                pr.reviewDecision === "approved"
                                  ? "text-green-600"
                                  : pr.reviewDecision === "changes_requested"
                                  ? "text-red-600"
                                  : "text-slate-500"
                              }
                            >
                              {reviewText}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 코멘트 섹션 */}
              {fullDetail.comments.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">코멘트</p>
                  {fullDetail.comments.map((comment) => (
                    <div key={comment.id} className="border rounded-md p-2 bg-white space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{comment.author.login}</span>
                        <span className="text-slate-400">
                          · {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ko })}
                        </span>
                      </div>
                      <p className="text-slate-600 line-clamp-3 whitespace-pre-wrap">{comment.body}</p>
                    </div>
                  ))}
                  {fullDetail.commentCount > fullDetail.comments.length && (
                    <a
                      href={link.issueUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline text-xs block text-right"
                    >
                      GitHub에서 전체 보기 ({fullDetail.commentCount}개) →
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
})}
```

- [ ] **Step 5: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 6: 전체 유닛 테스트 통과 확인**

```bash
pnpm test tests/unit
```

Expected: all pass

- [ ] **Step 7: 최종 커밋**

```bash
git add src/components/ticket/linked-issues-readonly.tsx
git commit -m "feat: linked-issues-readonly 아코디언 + on-demand 이슈 상세 로딩"
```
