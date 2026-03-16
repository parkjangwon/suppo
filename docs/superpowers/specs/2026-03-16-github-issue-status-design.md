# GitHub 이슈 상태 및 진척도 표시 기능 설계

**날짜:** 2026-03-16
**상태:** 승인됨

---

## 개요

티켓 상세 화면에서 연결된 GitHub/GitLab 이슈의 상태와 진척도를 인라인으로 표시한다. GitHub 접근 권한이 없는 상담원도 이슈 상태, 담당자, 레이블, 마일스톤, PR 연결 여부, 최근 업데이트 일시를 확인할 수 있게 한다.

---

## 요구사항

- 표시 정보: state(open/closed), assignees, labels, milestone(진행률 포함), PR 연결 여부, updated_at
- 데이터 갱신: 티켓 상세 페이지 로드 시 실시간 fetch
- 표시 위치: 기존 연결된 이슈 목록 각 항목 아래 인라인 확장
- 접근 권한: 어드민(전체 기능) + 해당 티켓에 배정된 상담원(읽기 전용)

---

## 데이터 레이어

### 1. GitProvider 인터페이스 확장

`/src/lib/git/provider.ts`에 `getIssue()` 메서드 시그니처 추가:

```ts
getIssue(repoFullName: string, issueNumber: number): Promise<IssueDetail>
```

`IssueDetail` 타입:

```ts
interface IssueDetail {
  state: 'open' | 'closed'
  assignees: { login: string; avatarUrl: string }[]
  labels: { name: string; color: string }[]
  milestone: {
    title: string
    dueOn: string | null
    openIssues: number
    closedIssues: number
  } | null
  hasPR: boolean
  updatedAt: string
}
```

### 2. GitHub Provider 구현

`/src/lib/git/providers/github.ts`에 `getIssue()` 구현:

```
GET https://api.github.com/repos/{owner}/{repo}/issues/{issue_number}
Authorization: Bearer {token}
```

### 3. GitLab Provider 구현

`/src/lib/git/providers/gitlab.ts`에 동일한 `getIssue()` 구현:

```
GET https://gitlab.com/api/v4/projects/{encoded_path}/issues/{issue_iid}
PRIVATE-TOKEN: {token}
```

### 4. CodeCommit

미지원 유지 — `getIssue()` 호출 시 `not supported` 에러 throw.

### 5. `/api/git/links` GET 엔드포인트 확장

기존 `GitLink` 레코드 반환에 이슈 상세 정보를 추가한다.
각 링크에 대해 `provider.getIssue()`를 `Promise.allSettled()`로 병렬 호출:

- 성공 시: `issueDetail` 필드에 `IssueDetail` 객체 포함
- 실패 시: `issueDetail: null` (개별 실패가 전체를 막지 않음)

응답 타입:

```ts
{
  id: string
  provider: GitProvider
  repoFullName: string
  issueNumber: number
  issueUrl: string
  issueDetail: IssueDetail | null
}[]
```

권한 체크: 기존 로직 유지 — 어드민 또는 해당 티켓에 배정된 상담원만 접근 가능.

---

## UI 레이어

### 1. 어드민용: `git-integration-section.tsx` 확장

연결된 이슈 목록 각 항목에 `issueDetail`을 인라인으로 표시한다.

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
- `state` 배지: `open` → `bg-green-100 text-green-700`, `closed` → `bg-purple-100 text-purple-700`
- `labels`: GitHub label color를 `backgroundColor`로 적용, 명도에 따라 텍스트 색상 자동 결정
- `milestone`: 제목 + `(완료수/전체수)` 형식
- `updated_at`: `date-fns`의 `formatDistanceToNow`로 상대 시간 표시
- `issueDetail: null`인 경우: "정보를 불러올 수 없습니다" 회색 텍스트로 graceful degradation

### 2. 상담원용: `linked-issues-readonly.tsx` (신규 컴포넌트)

어드민 전용 기능(이슈 연결/해제, 검색, 생성)을 제외하고 연결된 이슈 목록과 상세 정보만 표시하는 읽기 전용 컴포넌트.

- **파일 위치:** `/src/components/ticket/linked-issues-readonly.tsx`
- **렌더링 위치:** 상담원이 접근하는 티켓 상세 페이지

### 3. 데이터 fetching

기존 `git-integration-section.tsx`의 링크 목록 fetch 로직을 그대로 활용.
`/api/git/links?ticketId=xxx` 응답에 `issueDetail`이 포함되어 오므로 추가 API 호출 없음.

---

## 에러 처리

| 상황 | 처리 방식 |
|------|-----------|
| GitHub API 인증 실패 | `issueDetail: null` 반환, UI에서 "정보를 불러올 수 없습니다" 표시 |
| GitHub API rate limit | 동일하게 `issueDetail: null` 처리 |
| 네트워크 오류 | `Promise.allSettled`로 개별 실패 격리, 성공한 이슈는 정상 표시 |
| 이슈가 삭제된 경우 | 404 → `issueDetail: null` 처리 |

---

## 변경 파일 목록

| 파일 | 변경 유형 |
|------|-----------|
| `/src/lib/git/provider.ts` | 수정 — `getIssue()` 시그니처 추가 |
| `/src/lib/git/providers/github.ts` | 수정 — `getIssue()` 구현 |
| `/src/lib/git/providers/gitlab.ts` | 수정 — `getIssue()` 구현 |
| `/src/lib/git/providers/codecommit.ts` | 수정 — `getIssue()` not supported stub |
| `/src/app/api/git/links/route.ts` | 수정 — GET에서 `issueDetail` 병렬 fetch 추가 |
| `/src/components/ticket/git-integration-section.tsx` | 수정 — 이슈 상세 인라인 표시 |
| `/src/components/ticket/linked-issues-readonly.tsx` | 신규 — 상담원용 읽기 전용 컴포넌트 |
| 상담원 티켓 상세 페이지 | 수정 — `linked-issues-readonly.tsx` 렌더링 추가 |

---

## 범위 외 (이번 구현에서 제외)

- 이슈 상태 변경 기능 (읽기 전용)
- DB 캐싱 / 주기적 자동 갱신
- 고객(티켓 제출자) 공개 페이지에서의 표시
- CodeCommit 이슈 상세 지원
