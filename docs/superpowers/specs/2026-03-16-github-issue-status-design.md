# GitHub 이슈 상태 및 진척도 표시 기능 설계

**날짜:** 2026-03-16
**상태:** 승인됨

---

## 개요

티켓 상세 화면에서 연결된 GitHub/GitLab 이슈의 상태와 진척도를 인라인으로 표시한다. GitHub 접근 권한이 없는 상담원도 이슈 상태, 담당자, 레이블, 마일스톤, PR 연결 여부, 최근 업데이트 일시를 확인할 수 있게 한다.

---

## 요구사항

- 표시 정보: state, assignees, labels, milestone(진행률 포함), PR 연결 여부, updated_at
- 데이터 갱신: 티켓 상세 페이지 마운트 후 클라이언트 사이드 fetch
- 표시 위치: 기존 연결된 이슈 목록 각 항목 아래 인라인 확장 (항상 펼쳐진 상태)
- 접근 권한: 어드민(전체 기능) + 해당 티켓에 배정된 상담원(읽기 전용)

---

## 데이터 레이어

### 1. GitProvider 인터페이스 확장

`/src/lib/git/provider.ts`의 기존 `GitIssueProvider` 인터페이스에 `getIssue()`를 **선택적(optional) 메서드**로 추가한다. Optional로 추가하는 이유: CodeCommit 등 미지원 provider가 인터페이스 계약을 깨지 않고도 구현 가능하게 하기 위함.

```ts
getIssue?(repoFullName: string, issueNumber: number, signal?: AbortSignal): Promise<IssueDetail>
```

`IssueDetail` 타입 (같은 파일에 export):

```ts
export interface IssueDetail {
  state: 'open' | 'closed' | string  // 알 수 없는 값을 허용, UI에서 fallback 처리
  assignees: { login: string; avatarUrl: string }[]
  labels: { name: string; color: string }[]  // color: 6자리 hex (앞에 # 없음)
  milestone: {
    title: string
    dueOn: string | null
    openIssues: number
    closedIssues: number
  } | null
  hasPR: boolean
  updatedAt: string  // ISO 8601
}
```

> **GitLab `hasPR` 주의:** GitLab REST API의 이슈 단일 조회 응답에는 연결된 MR 정보가 포함되지 않는다. 별도의 `/issues/{iid}/related_merge_requests` 호출이 필요하나, 이번 구현 범위에서는 해당 호출을 생략하고 `hasPR: false`를 고정 반환한다.

### 2. GitHub Provider 구현

`/src/lib/git/providers/github.ts`에 `getIssue()` 구현:

```
GET https://api.github.com/repos/{owner}/{repo}/issues/{issue_number}
Authorization: Bearer {token}
```

내부 `fetch` 호출에 `signal` 전달: `fetch(url, { headers, signal })`. `pull_request` 필드 존재 여부로 `hasPR` 판단. GitHub 응답의 `state`는 `"open"` | `"closed"` | `"locked"` 가능 — 그대로 반환하고 UI에서 fallback 처리.

### 3. GitLab Provider 구현

`/src/lib/git/providers/gitlab.ts`에 `getIssue()` 구현:

```
GET https://gitlab.com/api/v4/projects/{encoded_path}/issues/{issue_iid}
PRIVATE-TOKEN: {token}
```

내부 `fetch` 호출에 `signal` 전달. `hasPR: false` 고정 반환.

### 4. CodeCommit

`getIssue` 미구현 — optional이므로 stub 불필요.

### 5. 자격증명(credential) 해결 방식

`/api/git/links/route.ts`의 GET 핸들러에서 기존 `/api/git/issues/search`와 동일한 패턴으로 credential을 조회한다:

```ts
// 링크 목록을 provider별로 그룹화
// 각 provider에 대해 GitProviderCredential 조회 (by provider enum)
// credential이 없는 provider의 모든 이슈: issueDetail = null
// credential이 있으면 decryptToken() 후 provider 인스턴스 생성
```

> **보안 설계 결정:** 배정된 상담원이 이슈 상세를 조회할 때도 어드민이 설정한 시스템 레벨 토큰을 사용한다. 상담원은 토큰 자체에 접근할 수 없으며, 서버가 대신 fetch한 결과만 전달받는다. 이는 의도된 설계이며, 상담원이 private 저장소 이슈 메타데이터를 읽을 수 있음을 허용한다.

### 6. `/api/git/links` GET 엔드포인트 확장

기존 `{ links: GitLink[] }` 응답 **envelope 유지**, 각 링크에 `issueDetail` 필드 추가.

**병렬 fetch 방식:**

```ts
// AbortController + setTimeout으로 3초 타임아웃 구현 (AbortSignal.timeout() 미사용 — Node.js 17.3+ 의존성 회피)
const controller = new AbortController()
const timer = setTimeout(() => controller.abort(), 3000)
try {
  await provider.getIssue(repoFullName, issueNumber, controller.signal)
} finally {
  clearTimeout(timer)
}
// 각 provider의 getIssue 구현은 signal을 내부 fetch({ signal })에 전달해야 함
```

- `Promise.allSettled()`로 병렬 호출
- 타임아웃, 오류, credential 없음, `getIssue` 미구현 — 모두 `issueDetail: null`로 처리

응답 타입:

```ts
{
  links: {
    id: string
    provider: GitProvider
    repoFullName: string
    issueNumber: number
    issueUrl: string
    createdAt: string
    issueDetail: IssueDetail | null
  }[]
}
```

권한 체크: 기존 로직 유지 — 어드민 또는 해당 티켓에 배정된 상담원만 접근 가능.

---

## UI 레이어

### 1. 데이터 흐름 (중요)

`git-integration-section.tsx`는 현재 `initialLinks`를 SSR 서버 컴포넌트에서 prop으로 받는다. 이슈 상세는 GitHub API 응답 속도에 의존하므로 SSR을 블로킹하지 않기 위해 **클라이언트 사이드 `useEffect`에서 별도 fetch**한다:

1. 페이지 SSR: `initialLinks` (issueDetail 없음) → 빠른 초기 렌더링
2. 컴포넌트 마운트 후: `GET /api/git/links?ticketId=xxx` 호출 → `issueDetail` 포함된 링크 목록 수신
3. 상태 업데이트: `linkedIssues`에 `issueDetail` 병합

로딩 중: 각 이슈 항목 아래에 스켈레톤(회색 줄 2개) 표시.

### 2. `GitLink` 타입 확장

컴포넌트 내 `GitLink` 타입에 `issueDetail` 추가:

```ts
type GitLink = {
  id: string
  provider: GitProvider
  repoFullName: string
  issueNumber: number
  issueUrl: string
  createdAt: Date
  issueDetail?: IssueDetail | null  // undefined = 아직 로딩 중, null = 로드 실패
}
```

### 3. 어드민용: `git-integration-section.tsx` 확장

연결된 이슈 목록 각 항목에 `issueDetail`을 인라인으로 항상 표시한다(토글 없음).

**레이아웃:**

```
[GITHUB] owner/repo #123  🟢 Open              [연결 해제]
  👤 assignee1  assignee2
  🏷  bug  enhancement
  🎯 v2.0  (12/20 완료)
  🔗 PR 연결됨
  🕒 3시간 전 업데이트
```

**세부 스타일:**
- `state` 배지:
  - `'open'` → `bg-green-100 text-green-700`
  - `'closed'` → `bg-purple-100 text-purple-700`
  - 그 외 (`'locked'` 등) → `bg-slate-100 text-slate-700` (fallback)
- `labels`: `#${color}` hex를 `backgroundColor`로 적용. 텍스트 색상: `(0.299×R + 0.587×G + 0.114×B) > 128`이면 `#000000`, 그 외 `#ffffff`
- `milestone`: 제목 + `(완료수/전체수)` 형식. `openIssues + closedIssues === 0`이면 제목만 표시
- `updated_at`: `date-fns`의 `formatDistanceToNow`로 상대 시간 표시
- `issueDetail: undefined` (로딩 중): 회색 스켈레톤 2줄
- `issueDetail: null` (로드 실패): "이슈 정보를 불러올 수 없습니다" 회색 텍스트

### 4. 상담원용: `linked-issues-readonly.tsx` (신규 컴포넌트)

어드민 전용 기능(이슈 연결/해제, 검색, 생성)을 제외하고 연결된 이슈 목록과 상세 정보만 표시하는 읽기 전용 컴포넌트.

- **파일 위치:** `/src/components/ticket/linked-issues-readonly.tsx`
- **렌더링 위치:** `/src/app/(admin)/admin/tickets/[id]/page.tsx` — 기존 `isAdmin` 조건부 렌더링 블록과 동일한 패턴으로, `isAdmin === false && isAssignee === true`일 때 렌더링
- 동일한 `useEffect` + `/api/git/links` fetch 패턴 적용
- 역할 체크는 컴포넌트가 아닌 페이지에서 수행

---

## 에러 처리

| 상황 | 처리 방식 |
|------|-----------|
| GitHub API 인증 실패 (401/403) | `issueDetail: null`, UI에서 "이슈 정보를 불러올 수 없습니다" |
| GitHub API rate limit (429) | `issueDetail: null` |
| 이슈가 삭제된 경우 (404) | `issueDetail: null` |
| 네트워크 오류 / 3초 타임아웃 | `issueDetail: null`, 성공한 이슈는 정상 표시 |
| 자격증명(credential) 미설정 | 해당 provider의 전체 이슈 `issueDetail: null` |
| `getIssue` 미구현 provider | `issueDetail: null` |
| `/api/git/links` 전체 요청 실패 | 기존 동작 유지 (`linkedIssues` 비어있음) |
| `state`가 예상 외 값 | UI fallback 배지 (`bg-slate-100`) 표시 |

---

## 수락 기준 (Acceptance Criteria)

1. 티켓 상세 페이지 진입 시 연결된 이슈가 있으면 마운트 후 state/assignees/labels/milestone/hasPR/updatedAt이 자동으로 표시된다.
2. issueDetail 로딩 중에는 각 이슈 항목 아래 스켈레톤이 표시된다.
3. `getIssue()` 호출에 3초 이상 걸리면 해당 이슈는 "이슈 정보를 불러올 수 없습니다"로 표시되고 나머지 이슈는 정상 표시된다.
4. GitHub 자격증명이 없거나 API 오류 시 이슈 목록 자체는 정상 표시되고 상세 정보만 fallback 상태로 표시된다.
5. 배정된 상담원은 이슈 상세 정보를 읽을 수 있지만 연결/해제 버튼이 없다.
6. 배정되지 않은 상담원은 이슈 상세 정보를 볼 수 없다 (403 응답).
7. milestone의 `openIssues + closedIssues === 0`인 경우 milestone 제목만 표시된다.
8. GitLab 이슈의 `hasPR`은 항상 false이므로 "PR 연결됨" 텍스트가 표시되지 않는다.
9. `state`가 `'locked'` 등 예상 외 값일 때 slate 배지 fallback으로 UI가 깨지지 않는다.

---

## 변경 파일 목록

| 파일 | 변경 유형 |
|------|-----------|
| `/src/lib/git/provider.ts` | 수정 — `getIssue()` optional 시그니처 및 `IssueDetail` 타입 추가 |
| `/src/lib/git/providers/github.ts` | 수정 — `getIssue()` 구현 |
| `/src/lib/git/providers/gitlab.ts` | 수정 — `getIssue()` 구현 (hasPR: false 고정) |
| `/src/app/api/git/links/route.ts` | 수정 — GET에서 `issueDetail` 병렬 fetch 추가 (3초 타임아웃) |
| `/src/components/ticket/git-integration-section.tsx` | 수정 — useEffect로 issueDetail fetch 및 인라인 표시 |
| `/src/components/ticket/linked-issues-readonly.tsx` | 신규 — 상담원용 읽기 전용 컴포넌트 |
| `/src/app/(admin)/admin/tickets/[id]/page.tsx` | 수정 — 상담원 조건에서 `linked-issues-readonly.tsx` 렌더링 |

---

## 범위 외 (이번 구현에서 제외)

- 이슈 상태 변경 기능 (읽기 전용)
- DB 캐싱 / 주기적 자동 갱신
- 고객(티켓 제출자) 공개 페이지에서의 표시
- CodeCommit 이슈 상세 지원
- GitLab PR 연결 여부 (별도 API 호출 필요)
