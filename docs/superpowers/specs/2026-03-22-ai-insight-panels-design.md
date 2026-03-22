# AI 인사이트 패널 설계 문서

**날짜:** 2026-03-22
**범위:** 대시보드, 분석 및 리포트, 상담원 관리, 감사 로그
**방식:** 온디맨드 (버튼 클릭 시 AI 호출)
**프로바이더:** 기존 Ollama / Gemini (LLMSettings 설정 재사용)

---

## 1. 목표

헬프데스크 관리자가 운영 현황을 숫자로만 보는 것이 아니라, AI가 해석한 자연어 인사이트를 각 메뉴에서 온디맨드로 받아볼 수 있도록 한다.

---

## 2. 기능 정의

### 2-1. 대시보드 — "오늘의 AI 브리핑"

**트리거:** "AI 브리핑 생성" 버튼 클릭
**권한:** admin / agent 모두 허용
**컨텍스트 데이터 (서버에서 DB 실시간 수집, 클라이언트에서 body 전달 없음):**
- 오늘 접수/해결 티켓 수
- 현재 열린 티켓 수, 긴급(URGENT) 티켓 수
- SLA 위반 위험 건수 (마감 2시간 이내)
- 오늘 평균 초기 응답 시간
- 오늘 CSAT 평균
- 활성 상담원 수 / 자리 비운 상담원 수

**출력:** 2~3문장 서술형 브리핑. 오늘 주목해야 할 포인트와 위험 신호를 중심으로 작성.

---

### 2-2. 분석 및 리포트 — "AI 데이터 해석"

**트리거:** "AI 인사이트 생성" 버튼 클릭
**권한:** admin / agent 모두 허용
**클라이언트 → 서버 전달 body:**
```json
{ "preset": "today" | "week" | "month" | "quarter" }
```
분석 페이지는 `"use client"` 컴포넌트이며, `useAnalyticsData(preset)` hook에서 현재 선택된 `preset`을 state로 관리한다. `AiInsightPanel`에 넘기는 `fetchFn`은 현재 `preset` 값을 클로저로 캡처하여 호출 시 body에 포함한다. preset이 변경돼도 패널은 자동으로 재생성되지 않으며, 사용자가 "다시 생성" 버튼을 클릭해야 새 결과를 받는다.

**서버에서 수집하는 데이터 (preset 기간 기준):**
- 총 티켓 수, 해결률, 평균 처리 시간
- CSAT 평균 및 응답률
- 카테고리별 티켓 분포 (상위 5개)
- 상담원별 처리 건수 및 해결률 (상위/하위)
- 전기 대비 주요 지표 변동률

**출력:** 지표의 의미, 이상치, 개선 권고사항을 서술형으로 해석. 단순 수치 나열 금지.

---

### 2-3. 상담원 관리 — "AI 성과 코칭"

**트리거:** "AI 성과 분석" 버튼 클릭
**권한:** admin 전용. 라우트 핸들러에서 `auth()`를 호출해 `session.user.role !== "ADMIN"`이면 403 반환.
**컨텍스트 데이터 (서버에서 DB 수집, 최근 30일 기준):**
- 각 상담원의 처리 건수, 해결률, CSAT 점수
- 평균 초기 응답 시간, 평균 처리 시간
- 전문 카테고리, 현재 배정 티켓 수

**출력:** 팀 전반의 강점/약점 요약 + 개선이 필요한 상담원에 대한 구체적 코칭 포인트. 특정 상담원을 지나치게 부정적으로 서술하지 않도록 프롬프트에 명시.

---

### 2-4. 감사 로그 — "AI 이상 패턴 탐지"

**트리거:** "AI 패턴 분석" 버튼 클릭
**권한:** admin 전용. 라우트 핸들러에서 `auth()`를 호출해 `session.user.role !== "ADMIN"`이면 403 반환.
**클라이언트 → 서버 전달 body (AuditLogList 컴포넌트의 현재 필터 상태):**
```json
{
  "search": "string (optional)",
  "action": "string (optional, AuditAction enum value or 'ALL')",
  "resourceType": "string (optional, or 'ALL')",
  "startDate": "string (optional, ISO date)",
  "endDate": "string (optional, ISO date)"
}
```
서버는 이 필터를 Prisma `where` 절에 적용해 최대 100건의 로그를 조회한다.

**LLM에 전달하는 로그 필드:**
- actorName, actorEmail, action, resourceType, resourceId, description, createdAt
- `oldValue` / `newValue`는 제외 (비밀번호 해시 등 민감 데이터 포함 가능)

**출력:** 비정상 패턴(짧은 시간 내 대량 액션, 비업무시간 접근, 반복 실패 등) 감지 및 설명. 이상 없으면 "특이 패턴이 감지되지 않았습니다"로 출력.

---

## 3. 아키텍처

### 3-1. 공통 UI 컴포넌트

**`src/components/admin/ai-insight-panel.tsx`**

```typescript
interface AiInsightPanelProps {
  title: string;                        // 패널 제목 (예: "AI 브리핑")
  fetchFn: () => Promise<string>;       // AI 결과 fetch 함수 (현재 상태를 클로저로 캡처)
  description?: string;                 // 버튼 하단 안내 문구 (선택)
}
```

상태 머신:
- `idle` → "AI 분석" 버튼 표시
- `loading` → 스피너 + "분석 중..." 텍스트. 버튼 비활성화.
- `success` → 결과 텍스트 + "다시 생성" 버튼
- `error` → 에러 메시지 + "재시도" 버튼

**결과 텍스트 렌더링:** `react-markdown`은 사용하지 않음. `whitespace-pre-wrap` 스타일의 `<p>` 태그로 표시. LLM 프롬프트에서 마크다운 문법 사용을 금지하고 평문 출력을 요구한다.

**클릭 쿨다운:** 성공/에러 후 "다시 생성" / "재시도" 버튼은 즉시 활성화. 중복 클릭 방지는 `loading` 상태에서 버튼 비활성화로 충분하다 (관리자 전용 기능으로 남용 위험 낮음).

`analysisEnabled = false`이면 버튼 대신 "AI 분석이 비활성화되어 있습니다. 설정에서 활성화하세요." 문구 표시.

---

### 3-2. API 엔드포인트

| 엔드포인트 | 파일 | 권한 | Request body |
|---|---|---|---|
| `POST /api/ai/dashboard-brief` | `app/api/ai/dashboard-brief/route.ts` | admin / agent | 없음 |
| `POST /api/ai/analytics-insight` | `app/api/ai/analytics-insight/route.ts` | admin / agent | `{ preset }` |
| `POST /api/ai/agent-coaching` | `app/api/ai/agent-coaching/route.ts` | **admin 전용** | 없음 |
| `POST /api/ai/audit-anomaly` | `app/api/ai/audit-anomaly/route.ts` | **admin 전용** | `{ search?, action?, resourceType?, startDate?, endDate? }` |

**공통 인증 패턴 (모든 라우트):**
```typescript
const session = await auth();
if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// admin 전용 라우트 추가:
if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

**공통 응답 형식:**
```json
{ "result": "AI가 생성한 텍스트" }
```
`analysisEnabled = false`이면 `{ "result": null }` 반환 (200).

---

### 3-3. AI 프롬프트 빌더

각 기능별로 `src/lib/ai/` 에 독립 파일로 분리:

| 파일 | 함수 시그니처 |
|---|---|
| `dashboard-brief.ts` | `generateDashboardBrief(stats: DashboardStats): Promise<string \| null>` |
| `analytics-insight.ts` | `generateAnalyticsInsight(metrics: AnalyticsMetrics): Promise<string \| null>` |
| `agent-coaching.ts` | `generateAgentCoaching(agents: AgentStats[]): Promise<string \| null>` |
| `audit-anomaly.ts` | `generateAuditAnomalyReport(logs: AuditLogEntry[]): Promise<string \| null>` |

각 파일은 기존 `src/lib/ai/summarizer.ts` 패턴을 따름:
1. `getLlmSettings()` 호출
2. `analysisEnabled` 체크 → `false`이면 `null` 반환
3. 프롬프트 빌드 (평문 출력 지시 포함)
4. `runProvider(prompt, settings)` 호출
5. 결과 반환

---

### 3-4. 페이지 통합

| 페이지 | 위치 | `fetchFn` 구성 방식 |
|---|---|---|
| `admin/dashboard/page.tsx` (Server Component) | 통계 카드 아래 | Client wrapper에서 `fetch('/api/ai/dashboard-brief', { method: 'POST' })` |
| `admin/analytics/page.tsx` (Client Component) | 필터 바 아래, 차트 위 | `preset` state를 클로저로 캡처한 함수 |
| `admin/agents/page.tsx` | 상담원 목록 위 | `fetch('/api/ai/agent-coaching', { method: 'POST' })` |
| `admin/audit-logs/page.tsx` → `AuditLogList` | 로그 테이블 위 | `{ search, action, resourceType, startDate, endDate }` state를 클로저로 캡처 |

대시보드는 Server Component이므로 `AiInsightPanel`을 감싸는 최소 Client wrapper(`"use client"`) 컴포넌트를 별도로 만든다.

---

## 4. 제약 및 고려사항

- **마크다운 미사용:** 새 패키지 설치 없이 평문 렌더링. 모든 프롬프트에 "마크다운 없이 평문으로 작성"을 명시.
- **데이터 민감성:** 감사 로그 분석 시 `oldValue`/`newValue` (비밀번호 해시 등 포함 가능)는 LLM에 전송하지 않음.
- **권한 분리:** `dashboard-brief`, `analytics-insight`는 admin/agent 공통. `agent-coaching`, `audit-anomaly`는 admin 전용. 라우트 핸들러에서 `auth()` 호출로 직접 체크.
- **AI 비활성화:** `LLMSettings.analysisEnabled = false`이면 패널은 비활성 안내 문구를 표시하고, API는 `{ result: null }`을 즉시 반환.
- **오류 처리:** LLM 호출 실패 시 패널에 에러 상태 표시, 서버 로그에 기록. 재시도 가능.
- **CSP:** 새로운 외부 리소스를 추가하지 않으므로 `next.config.ts` CSP 헤더 수정 불필요.

---

## 5. 구현 순서 (권장)

1. `AiInsightPanel` 공통 컴포넌트
2. `dashboard-brief` (가장 단순, 고정 데이터, body 없음)
3. `analytics-insight` (preset 클로저 패턴)
4. `agent-coaching` (admin 전용 권한 처리)
5. `audit-anomaly` (필터 직렬화 + 민감 데이터 필터링)
