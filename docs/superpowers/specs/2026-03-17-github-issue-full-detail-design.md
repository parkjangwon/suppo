# GitHub 이슈 상세 정보 확장 설계

**날짜:** 2026-03-17
**상태:** Draft

---

## 목표

티켓 상세 화면의 연결된 이슈 목록에서, 이슈를 클릭해 펼치면 코멘트(처음 3개)와 연결된 PR 상세 정보(제목, 상태, 브랜치, 리뷰 상태)를 볼 수 있도록 한다. 기존에 표시하던 state·담당자·레이블·마일스톤·업데이트 일시는 유지한다.

---

## 기능 요구사항

- **아코디언 표시**: 이슈 카드는 기본적으로 접혀있고, 클릭 시 펼쳐진다. 접힌 상태에서도 상태 배지·PR 수·코멘트 수를 미리 표시한다.
- **코멘트**: 처음 3개만 표시 (최초 작성 순서). 전체 코멘트는 "GitHub에서 전체 보기 (N개) →" 링크로 연결한다.
- **연결된 PR**: 제목, 상태(open/merged/closed), 브랜치(head → base), 리뷰 상태, GitHub 링크를 표시한다.
- **on-demand 로딩**: 아코디언을 열 때만 API 호출. 닫혀있는 이슈는 API 호출 없음.
- **로딩 상태**: 펼치는 중에는 스피너 + 스켈레톤 바 표시.
- **에러 상태**: 로딩 실패 시 "상세 정보를 불러올 수 없습니다." 표시.

---

## 데이터 모델

`src/lib/git/provider.ts`에 추가:

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
  state: 'open' | 'merged' | 'closed';  // 'merged' = closed + merged_at 정규화
  headBranch: string;
  baseBranch: string;
  reviewDecision: 'approved' | 'changes_requested' | 'review_required' | null;
  isDraft: boolean;
  url: string;
}

export interface IssueFullDetail extends IssueDetail {
  comments: IssueComment[];   // 처음 3개만
  commentCount: number;       // 전체 코멘트 수 (GitHub에서 전체 보기 N개 표시용)
  linkedPRs: LinkedPR[];
  issueUrl: string;           // "GitHub에서 전체 보기" 링크 대상
}
```

`GitIssueProvider` 인터페이스에 추가:

```typescript
getIssueFullDetail?(
  repoFullName: string,
  issueNumber: number,
  signal?: AbortSignal
): Promise<IssueFullDetail>;
```

기존 `getIssue()` 메서드는 그대로 유지 (페이지 로드 시 기본 상세 표시에 계속 사용).

---

## API 레이어

### 새 엔드포인트

`GET /api/git/issue-detail?ticketId=<id>&linkId=<id>`

- **인증**: 기존 `/api/git/links`와 동일 — admin 또는 해당 티켓의 assignee만 접근 가능.
- **`linkId`로 DB 조회**: `prisma.gitLink.findUnique({ where: { id: linkId } })` → provider / repoFullName / issueNumber 확인. `linkId`가 해당 `ticketId`에 속하지 않으면 404 반환 (임의 레포 조회 방지).
- **타임아웃**: 5초 (`AbortController` + `setTimeout`). GitHub의 2-round fetch를 수용하기 위해 기존 3초보다 여유 있게 설정.
- **응답**: `{ detail: IssueFullDetail }` 또는 에러 시 `{ error: string }`.

### GitHub `getIssueFullDetail()` 구현

**Round 1 — 병렬 실행:**
1. `GET /repos/{owner}/{repo}/issues/{number}` — state, labels, assignees, milestone, `comments`(count), `html_url`
2. `GET /repos/{owner}/{repo}/issues/{number}/comments?per_page=3` — 처음 3개 코멘트
3. `GET /repos/{owner}/{repo}/issues/{number}/timeline` — `cross_referenced` 이벤트 중 `source.type === "issue"` && `source.issue.pull_request` 존재하는 것에서 PR 번호 추출

**Round 2 — 연결된 PR 번호 확인 후 병렬 실행:**
- 각 PR 번호에 대해:
  - `GET /repos/{owner}/{repo}/pulls/{pr_number}` — title, state, merged_at, head/base branch, draft, html_url
  - `GET /repos/{owner}/{repo}/pulls/{pr_number}/reviews` — 리뷰 결정 계산

**리뷰 상태 계산 로직:**
1. 리뷰어별 최신 리뷰 상태 추출 (dismissed 제외)
2. `CHANGES_REQUESTED`가 하나라도 있으면 → `changes_requested`
3. 모두 `APPROVED`이고 1개 이상이면 → `approved`
4. PR 객체에 `requested_reviewers`가 있으면 → `review_required`
5. 그 외 → `null`

**PR state 정규화:**
- `state === "closed"` && `merged_at !== null` → `"merged"`
- `state === "closed"` && `merged_at === null` → `"closed"`
- `state === "open"` → `"open"`

### GitLab `getIssueFullDetail()` 구현

**Round 1 — 병렬 실행 (1라운드로 완결):**
1. `GET /projects/:encoded_path/issues/:iid` — 기본 정보, `user_notes_count`(코멘트 수), `web_url`
2. `GET /projects/:encoded_path/issues/:iid/notes?per_page=3&sort=asc&order_by=created_at` — 처음 3개 코멘트, `system: false` 필터링
3. `GET /projects/:encoded_path/issues/:iid/related_merge_requests` — 연결된 MR 목록

**GitLab MR state 정규화:**
- `state === "merged"` → `"merged"`
- `state === "closed"` → `"closed"`
- `state === "opened"` → `"open"`

**GitLab 리뷰 상태:** 기본 MR 객체로 판단 어려워 `null` 처리.

---

## UI 레이어

### 변경 파일
- `src/lib/git/provider.ts` — 새 타입 추가
- `src/lib/git/providers/github.ts` — `getIssueFullDetail()` 구현
- `src/lib/git/providers/gitlab.ts` — `getIssueFullDetail()` 구현
- `src/app/api/git/issue-detail/route.ts` — **새 파일**
- `src/components/ticket/issue-detail-helpers.ts` — PR state 배지 헬퍼 추가
- `src/components/ticket/git-integration-section.tsx` — 아코디언 + on-demand 로딩
- `src/components/ticket/linked-issues-readonly.tsx` — 동일 변경

### 컴포넌트 상태 변경

기존:
```typescript
const [issueDetails, setIssueDetails] = useState<Record<string, IssueDetail | null | undefined>>({});
```

변경 후:
```typescript
const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
const [fullDetails, setFullDetails] = useState<Record<string, IssueFullDetail | null | undefined>>({});
// undefined = 아직 로딩 안 함, null = 로딩 실패, IssueFullDetail = 로딩 완료
```

기존 `issueDetails` (페이지 로드 시 기본 정보 fetch) 는 그대로 유지. `fullDetails`는 아코디언 열 때 on-demand로 채워진다.

### 아코디언 토글 핸들러

```typescript
const toggleExpand = async (link: GitLink) => {
  const isExpanding = !expandedIssues.has(link.id);
  setExpandedIssues(prev => {
    const next = new Set(prev);
    isExpanding ? next.add(link.id) : next.delete(link.id);
    return next;
  });

  if (isExpanding && fullDetails[link.id] === undefined) {
    // undefined = 아직 한 번도 로딩 안 함 → fetch
    const params = new URLSearchParams({
      ticketId,
      linkId: link.id
    });
    try {
      const res = await fetch(`/api/git/issue-detail?${params}`);
      if (!res.ok) throw new Error("failed");
      const data = await res.json() as { detail: IssueFullDetail };
      setFullDetails(prev => ({ ...prev, [link.id]: data.detail }));
    } catch {
      setFullDetails(prev => ({ ...prev, [link.id]: null }));
    }
  }
};
```

이미 로딩한 이슈(null 또는 IssueFullDetail)는 다시 fetch하지 않는다 (undefined가 아닌 경우 skip).

### 렌더링 구조 (펼친 상태)

```
┌──────────────────────────────────────────────────────┐
│ ▼ [GITHUB] owner/repo #42 — 이슈 제목          open │
│                             PR 1  💬 12  연결 해제  │
├──────────────────────────────────────────────────────┤
│ 담당자: alice    레이블: bug  priority:high           │
│ 마일스톤: v2.1 (7/10 완료)         3시간 전 업데이트 │
├──────────────────────────────────────────────────────┤
│ 연결된 Pull Request                                  │
│ ┌────────────────────────────────────────────────┐  │
│ │ ⑂ #10 — fix: resolve null pointer    [merged]  │  │
│ │   feature/fix-null → main  ✓ approved  GitHub→ │  │
│ └────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────┤
│ 코멘트                                               │
│ ┌─ bob · 5시간 전 ──────────────────────────────┐  │
│ │ 재현 확인했습니다. production 환경에서만...     │  │
│ └────────────────────────────────────────────────┘  │
│ ┌─ alice · 3시간 전 ─────────────────────────────┐  │
│ │ 원인 파악했습니다. PR 올렸습니다.               │  │
│ └────────────────────────────────────────────────┘  │
│                  GitHub에서 전체 보기 (12개) →       │
└──────────────────────────────────────────────────────┘
```

### 헬퍼 함수 추가

`src/components/ticket/issue-detail-helpers.ts`에 추가:

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

---

## 에러 처리

| 상황 | 처리 |
|------|------|
| 5초 타임아웃 초과 | `fullDetails[linkId] = null` → "상세 정보를 불러올 수 없습니다." |
| provider credential 없음 | 동일 |
| GitHub API 4xx/5xx | 동일 |
| PR 상세 fetch 실패 | `linkedPRs: []` 로 부분 성공 처리 (코멘트는 표시) |
| GitLab notes fetch 실패 | `comments: []` 로 부분 성공 처리 (MR은 표시) |

---

## 테스트 계획

### 단위 테스트

- `tests/unit/git/github-provider-full-detail.spec.ts`
  - PR 없는 이슈: `linkedPRs: []`
  - PR 1개 + reviews: state 정규화, 리뷰 상태 계산
  - 코멘트 3개 매핑
  - signal 전달 확인

- `tests/unit/git/gitlab-provider-full-detail.spec.ts`
  - 코멘트 system 노트 필터링 (system: true 제외)
  - MR state 정규화 (opened → open, merged → merged)

- `tests/unit/git/issue-detail-route.spec.ts`
  - 정상 응답: `{ detail: IssueFullDetail }`
  - linkId가 ticketId에 속하지 않을 때: 404
  - credential 없을 때: `{ error }` 500

- `tests/unit/components/issue-detail-helpers.spec.ts`
  - `getPRStateBadgeClass` 3가지 state
  - `getReviewDecisionText` 4가지 값

### 수동 확인

1. 아코디언 열기 → 스켈레톤 표시 → 상세 정보 표시
2. 같은 이슈 다시 닫고 열기 → API 재호출 없음 (캐시)
3. PR 없는 이슈 → "연결된 PR 없음" 표시
4. 코멘트 없는 이슈 → 코멘트 섹션 미표시
5. GitHub API 에러 → "상세 정보를 불러올 수 없습니다."

---

## 인수 기준

1. 이슈 카드를 클릭하면 아코디언이 펼쳐지며 상세 정보를 표시한다
2. 접힌 상태에서 PR 수와 코멘트 수를 미리 표시한다
3. PR 상세 (제목, state 배지, 브랜치 정보, 리뷰 상태, GitHub 링크)를 표시한다
4. 코멘트 처음 3개를 표시하고, 전체 코멘트는 GitHub 링크로 연결한다
5. 한 번 로딩한 이슈는 다시 열어도 API를 재호출하지 않는다
6. 로딩 중에는 스피너와 스켈레톤 바를 표시한다
7. 로딩 실패 시 에러 메시지를 표시하고 다른 이슈에 영향을 주지 않는다
8. 상담원 읽기 전용 컴포넌트(`linked-issues-readonly.tsx`)에도 동일하게 적용된다
