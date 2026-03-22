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
**컨텍스트 데이터 (DB 실시간 수집):**
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
**컨텍스트 데이터 (현재 선택된 기간의 analytics 지표):**
- 총 티켓 수, 해결률, 평균 처리 시간
- CSAT 평균 및 응답률
- 카테고리별 티켓 분포 (상위 5개)
- 상담원별 처리 건수 및 해결률 (상위/하위)
- 전기 대비 주요 지표 변동률

**출력:** 지표의 의미, 이상치, 개선 권고사항을 서술형으로 해석. 단순 수치 나열 금지.

---

### 2-3. 상담원 관리 — "AI 성과 코칭"

**트리거:** "AI 성과 분석" 버튼 클릭
**컨텍스트 데이터 (전체 활성 상담원):**
- 각 상담원의 처리 건수, 해결률, CSAT 점수
- 평균 초기 응답 시간, 평균 처리 시간
- 전문 카테고리, 현재 배정 티켓 수
- 최근 30일 기준

**출력:** 팀 전반의 강점/약점 요약 + 개선이 필요한 상담원에 대한 구체적 코칭 포인트. 특정 상담원을 지나치게 부정적으로 서술하지 않도록 프롬프트에 명시.

---

### 2-4. 감사 로그 — "AI 이상 패턴 탐지"

**트리거:** "AI 패턴 분석" 버튼 클릭
**컨텍스트 데이터 (현재 필터 기준 최대 100건의 감사 로그):**
- actorName, actorEmail, action, resourceType, resourceId, description, createdAt
- oldValue/newValue는 제외 (민감 데이터, 토큰 절약)

**출력:** 비정상 패턴(짧은 시간 내 대량 액션, 비업무시간 접근, 반복 실패 등) 감지 및 설명. 이상 없으면 "특이 패턴이 감지되지 않았습니다"로 출력.

---

## 3. 아키텍처

### 3-1. 공통 UI 컴포넌트

**`src/components/admin/ai-insight-panel.tsx`**

```typescript
interface AiInsightPanelProps {
  title: string;          // 패널 제목 (예: "AI 브리핑")
  fetchFn: () => Promise<string>;  // AI 결과 fetch 함수
  description?: string;   // 버튼 하단 안내 문구 (선택)
}
```

상태 머신:
- `idle` → "AI 분석" 버튼 표시
- `loading` → 스피너 + "분석 중..." 텍스트
- `success` → 마크다운 렌더링된 결과 텍스트 + "다시 생성" 버튼
- `error` → 에러 메시지 + "재시도" 버튼

`analysisEnabled = false`이면 "AI 설정이 비활성화되어 있습니다" 메시지 표시.

---

### 3-2. API 엔드포인트

모든 엔드포인트는 `POST`, 세션 인증 필수 (admin/agent 모두 허용).

| 엔드포인트 | 파일 | 데이터 출처 |
|---|---|---|
| `/api/ai/dashboard-brief` | `app/api/ai/dashboard-brief/route.ts` | 대시보드 통계 쿼리 |
| `/api/ai/analytics-insight` | `app/api/ai/analytics-insight/route.ts` | body: `{ dateFrom, dateTo }` |
| `/api/ai/agent-coaching` | `app/api/ai/agent-coaching/route.ts` | 전체 활성 상담원 성과 지표 |
| `/api/ai/audit-anomaly` | `app/api/ai/audit-anomaly/route.ts` | body: `{ filters }` (현재 필터 상태) |

공통 응답 형식:
```json
{ "result": "AI가 생성한 텍스트" }
```

---

### 3-3. AI 프롬프트 빌더

각 기능별로 `src/lib/ai/` 에 독립 파일로 분리:

- `dashboard-brief.ts` — `generateDashboardBrief(stats)`
- `analytics-insight.ts` — `generateAnalyticsInsight(metrics)`
- `agent-coaching.ts` — `generateAgentCoaching(agents)`
- `audit-anomaly.ts` — `generateAuditAnomalyReport(logs)`

각 파일은 기존 `src/lib/ai/summarizer.ts` 패턴을 따름:
1. `getLlmSettings()` 호출
2. `analysisEnabled` 체크
3. 프롬프트 빌드
4. `runProvider(prompt, settings)` 호출
5. 결과 반환

---

### 3-4. 페이지 통합

각 페이지에서 `<AiInsightPanel>`을 기존 레이아웃의 상단 또는 적절한 위치에 삽입:

- **대시보드** (`admin/dashboard/page.tsx`): 기존 통계 카드 아래
- **분석** (`admin/analytics/page.tsx`): 필터 바 아래, 차트 위
- **상담원 관리** (`admin/agents/page.tsx`): 상담원 목록 위
- **감사 로그** (`admin/audit-logs/page.tsx`): 로그 테이블 위

---

## 4. 제약 및 고려사항

- **비용/속도:** Gemini Flash 또는 Ollama 소형 모델 사용 시 충분히 빠름. 대시보드 브리핑은 간결하게 출력 유도 (max 300 tokens).
- **데이터 민감성:** 감사 로그 분석 시 oldValue/newValue (비밀번호 해시 등 포함 가능)는 LLM에 전송하지 않음.
- **권한:** 모든 AI 엔드포인트는 인증된 관리자/상담원만 호출 가능. agent-coaching은 admin 전용.
- **AI 비활성화:** `LLMSettings.analysisEnabled = false`이면 모든 패널이 비활성 상태로 표시되며 API도 즉시 반환.
- **오류 처리:** LLM 호출 실패 시 사용자에게 에러 표시, 서버 로그에 기록. 재시도 가능.

---

## 5. 구현 순서 (권장)

1. `AiInsightPanel` 공통 컴포넌트
2. `dashboard-brief` (가장 단순, 고정 데이터)
3. `analytics-insight` (기간 필터 연동)
4. `agent-coaching` (admin 전용 권한 처리)
5. `audit-anomaly` (민감 데이터 필터링 주의)
