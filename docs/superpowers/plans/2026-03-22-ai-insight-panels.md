# AI 인사이트 패널 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드, 분석, 상담원 관리, 감사 로그 4개 메뉴에 온디맨드 AI 인사이트 패널을 추가한다.

**Architecture:** 공통 `AiInsightPanel` React 컴포넌트 하나 + 4개 API 라우트 + 4개 AI 프롬프트 빌더 함수. 각 페이지는 `fetchFn` 클로저만 교체해 패널을 재사용한다. 각 프롬프트 빌더 파일은 기존 `src/lib/ai/summarizer.ts` 선례에 따라 `getLlmSettings` / `runProvider`를 모듈-private 함수로 직접 선언한다 (export되지 않으므로 import 불가). `service.ts`에서 import하지 않는 이 패턴은 의도적 설계이며, 각 파일의 독립성을 유지한다.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma ORM, shadcn/ui, Ollama/Gemini LLM

**AI 비활성화 처리:** `LLMSettings.analysisEnabled = false`이면 AI 패널이 완전히 숨겨진다 (버튼 포함, 비활성 안내 문구도 표시하지 않음). Server Component 페이지(대시보드, 상담원 관리)는 `prisma.lLMSettings.findFirst()`로 서버에서 직접 읽어 조건부 렌더링. Client Component 페이지(분석, 감사 로그)는 서버 부모에서 `analysisEnabled` prop으로 전달.

**Spec:** `docs/superpowers/specs/2026-03-22-ai-insight-panels-design.md`

---

## 파일 구조

### 신규 생성
| 파일 | 역할 |
|---|---|
| `src/components/admin/ai-insight-panel.tsx` | 공통 UI 패널 컴포넌트 |
| `src/components/admin/dashboard-ai-section.tsx` | 대시보드 페이지 Client wrapper (Server Component에서 fetchFn 전달 불가 해결) |
| `src/components/admin/agent-ai-section.tsx` | 상담원 페이지 Client wrapper (동일 이유) |
| `src/app/(admin)/admin/analytics/analytics-content.tsx` | 분석 페이지 Client 컴포넌트 (기존 page.tsx 내용 분리 + `analysisEnabled` prop 수신) |
| `src/lib/ai/dashboard-brief.ts` | 대시보드 브리핑 프롬프트 빌더 |
| `src/lib/ai/analytics-insight.ts` | 분석 인사이트 프롬프트 빌더 |
| `src/lib/ai/agent-coaching.ts` | 상담원 코칭 프롬프트 빌더 |
| `src/lib/ai/audit-anomaly.ts` | 감사 로그 이상탐지 프롬프트 빌더 |
| `src/app/api/ai/dashboard-brief/route.ts` | 대시보드 브리핑 API |
| `src/app/api/ai/analytics-insight/route.ts` | 분석 인사이트 API |
| `src/app/api/ai/agent-coaching/route.ts` | 상담원 코칭 API (admin 전용) |
| `src/app/api/ai/audit-anomaly/route.ts` | 감사 로그 이상탐지 API (admin 전용) |
| `tests/unit/ai/dashboard-brief.spec.ts` | 대시보드 브리핑 유닛 테스트 |
| `tests/unit/ai/analytics-insight.spec.ts` | 분석 인사이트 유닛 테스트 |
| `tests/unit/ai/agent-coaching.spec.ts` | 상담원 코칭 유닛 테스트 |
| `tests/unit/ai/audit-anomaly.spec.ts` | 감사 로그 이상탐지 유닛 테스트 |

### 수정
| 파일 | 변경 내용 |
|---|---|
| `src/app/(admin)/admin/dashboard/page.tsx` | `analysisEnabled` 체크 후 `DashboardAiSection` 조건부 삽입 |
| `src/app/(admin)/admin/analytics/page.tsx` | Server Component 쉘로 교체, `analysisEnabled`를 `AnalyticsContent`에 전달 |
| `src/app/(admin)/admin/agents/page.tsx` | `analysisEnabled && isAdmin` 체크 후 `AgentAiSection` 조건부 삽입 |
| `src/components/admin/audit-log-list.tsx` | `AiInsightPanel` + 필터 클로저 삽입 (`analysisEnabled` prop 추가) |
| `src/app/(admin)/admin/audit-logs/page.tsx` | `analysisEnabled` 읽어 `AuditLogList`에 전달 |
| `src/app/(admin)/admin/analytics/page.tsx` | Server Component 쉘로 교체, `analysisEnabled` 전달 |

---

## Task 1: 공통 `AiInsightPanel` 컴포넌트

**Files:**
- Create: `src/components/admin/ai-insight-panel.tsx`

- [ ] **Step 1: 컴포넌트 파일 생성**

```typescript
// src/components/admin/ai-insight-panel.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, RefreshCw, AlertCircle } from "lucide-react";

interface AiInsightPanelProps {
  title: string;
  fetchFn: () => Promise<string | null>;
  description?: string;
}

// result === null means AI is disabled (parent should prevent rendering, but null → null as safety net)
type State = "idle" | "loading" | "success" | "error";

export function AiInsightPanel({ title, fetchFn, description }: AiInsightPanelProps) {
  const [state, setState] = useState<State>("idle");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setState("loading");
    setError(null);
    try {
      const text = await fetchFn();
      if (text === null) {
        // analysisEnabled = false — 부모가 렌더링을 막아야 하지만 방어적으로 error 처리
        setError("AI 분석 결과를 가져올 수 없습니다.");
        setState("error");
        return;
      }
      setResult(text);
      setState("success");
    } catch {
      setError("AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      setState("error");
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            {title}
          </CardTitle>
          {state === "success" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={run}
              className="gap-1 text-xs h-7"
            >
              <RefreshCw className="h-3 w-3" />
              다시 생성
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {state === "idle" && (
          <div className="space-y-2">
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            <Button size="sm" onClick={run} className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI 분석
            </Button>
          </div>
        )}
        {state === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            분석 중...
          </div>
        )}
        {state === "success" && result && (
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {result}
          </p>
        )}
        {state === "error" && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={run} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              재시도
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/admin/ai-insight-panel.tsx
git commit -m "feat: AiInsightPanel 공통 컴포넌트 추가"
```

---

## Task 2: 대시보드 브리핑 — 프롬프트 빌더 + API

**Files:**
- Create: `src/lib/ai/dashboard-brief.ts`
- Create: `src/app/api/ai/dashboard-brief/route.ts`
- Create: `tests/unit/ai/dashboard-brief.spec.ts`

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// tests/unit/ai/dashboard-brief.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    lLMSettings: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/llm/providers/gemini", () => ({
  callGemini: vi.fn(),
}));

vi.mock("@/lib/llm/providers/ollama", () => ({
  callOllama: vi.fn(),
}));

import { generateDashboardBrief } from "@/lib/ai/dashboard-brief";
import { prisma } from "@/lib/db/client";
import { callGemini } from "@/lib/llm/providers/gemini";

const mockSettings = {
  id: "default",
  provider: "gemini",
  analysisEnabled: true,
  geminiApiKey: "test-key",
  geminiModel: "gemini-1.5-flash",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3.2",
  analysisPrompt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStats = {
  todayCreated: 12,
  todayResolved: 8,
  openTickets: 34,
  urgentTickets: 3,
  slaAtRiskCount: 2,
  avgFirstResponseMinutes: 25,
  csatAvg: 4.2,
  activeAgents: 5,
  absentAgents: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateDashboardBrief", () => {
  it("analysisEnabled가 false이면 null 반환", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue({
      ...mockSettings,
      analysisEnabled: false,
    });

    const result = await generateDashboardBrief(mockStats);
    expect(result).toBeNull();
  });

  it("LLM 결과를 trim해서 반환", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockResolvedValue("  오늘 운영 현황 브리핑입니다.  ");

    const result = await generateDashboardBrief(mockStats);
    expect(result).toBe("오늘 운영 현황 브리핑입니다.");
  });

  it("LLM 호출 실패 시 null 반환", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockRejectedValue(new Error("network error"));

    const result = await generateDashboardBrief(mockStats);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
pnpm test tests/unit/ai/dashboard-brief.spec.ts
```
Expected: FAIL — `Cannot find module '@/lib/ai/dashboard-brief'`

- [ ] **Step 3: 프롬프트 빌더 구현**

```typescript
// src/lib/ai/dashboard-brief.ts
import type { LLMSettings } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { callGemini } from "@/lib/llm/providers/gemini";
import { callOllama } from "@/lib/llm/providers/ollama";

export interface DashboardStats {
  todayCreated: number;
  todayResolved: number;
  openTickets: number;
  urgentTickets: number;
  slaAtRiskCount: number;
  avgFirstResponseMinutes: number | null;
  csatAvg: number | null;
  activeAgents: number;
  absentAgents: number;
}

async function getLlmSettings(): Promise<LLMSettings> {
  return prisma.lLMSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

async function runProvider(prompt: string, settings: LLMSettings): Promise<string> {
  const provider = settings.provider.trim().toLowerCase();
  if (provider === "ollama") return callOllama(prompt, settings);
  if (provider === "gemini") return callGemini(prompt, settings);
  throw new Error(`지원하지 않는 LLM provider: ${settings.provider}`);
}

function buildPrompt(stats: DashboardStats): string {
  const responseTime = stats.avgFirstResponseMinutes != null
    ? `${Math.round(stats.avgFirstResponseMinutes)}분`
    : "측정 불가";
  const csat = stats.csatAvg != null
    ? `${stats.csatAvg.toFixed(1)}점`
    : "데이터 없음";

  return `당신은 헬프데스크 운영 분석가입니다. 오늘의 운영 현황을 2~3문장으로 간결하게 브리핑해주세요.

=== 오늘의 운영 현황 ===
- 오늘 접수된 티켓: ${stats.todayCreated}건
- 오늘 해결된 티켓: ${stats.todayResolved}건
- 현재 열린 티켓: ${stats.openTickets}건
- 긴급 티켓: ${stats.urgentTickets}건
- SLA 위반 위험 티켓: ${stats.slaAtRiskCount}건 (마감 2시간 이내)
- 평균 초기 응답 시간: ${responseTime}
- CSAT 평균: ${csat}
- 활성 상담원: ${stats.activeAgents}명 (자리 비운: ${stats.absentAgents}명)

=== 요청사항 ===
- 2~3문장으로 간결하게 작성하세요.
- 오늘 주목해야 할 포인트와 위험 신호를 중심으로 작성하세요.
- 마크다운 없이 평문으로 작성하세요.
- 한국어로 작성하세요.

브리핑:`;
}

export async function generateDashboardBrief(
  stats: DashboardStats
): Promise<string | null> {
  const settings = await getLlmSettings();
  if (!settings.analysisEnabled) return null;

  try {
    const result = await runProvider(buildPrompt(stats), settings);
    return result.trim();
  } catch (error) {
    console.error("generateDashboardBrief failed:", error);
    return null;
  }
}
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
pnpm test tests/unit/ai/dashboard-brief.spec.ts
```
Expected: 3 tests PASS

- [ ] **Step 5: API 라우트 구현**

```typescript
// src/app/api/ai/dashboard-brief/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { generateDashboardBrief } from "@/lib/ai/dashboard-brief";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const [
      todayCreated,
      todayResolved,
      openTickets,
      urgentTickets,
      slaAtRiskCount,
      activeAgents,
      absentAgents,
      csatAgg,
    ] = await Promise.all([
      prisma.ticket.count({ where: { createdAt: { gte: today } } }),
      prisma.ticket.count({ where: { resolvedAt: { gte: today } } }),
      prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } } }),
      prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] }, priority: "URGENT" } }),
      prisma.sLAClock.count({
        where: {
          status: "RUNNING",
          breachedAt: null,
          deadline: { lte: twoHoursLater, gte: new Date() },
        },
      }),
      prisma.agent.count({ where: { isActive: true } }),
      prisma.agentAbsence.count({
        where: {
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      }),
      prisma.cSATResponse.aggregate({
        _avg: { score: true },
        where: { createdAt: { gte: today } },
      }),
    ]);

    const result = await generateDashboardBrief({
      todayCreated,
      todayResolved,
      openTickets,
      urgentTickets,
      slaAtRiskCount,
      avgFirstResponseMinutes: null, // 복잡한 집계 — null로 전달
      csatAvg: csatAgg._avg.score,
      activeAgents,
      absentAgents,
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error("dashboard-brief API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 6: 커밋**

```bash
git add src/lib/ai/dashboard-brief.ts \
        src/app/api/ai/dashboard-brief/route.ts \
        tests/unit/ai/dashboard-brief.spec.ts
git commit -m "feat: 대시보드 AI 브리핑 — 프롬프트 빌더 + API"
```

---

## Task 3: 대시보드 페이지에 패널 통합

**Files:**
- Modify: `src/app/(admin)/admin/dashboard/page.tsx`

대시보드는 Server Component이므로 `AiInsightPanel`을 직접 렌더할 수 없다. 최소 Client wrapper를 인라인으로 선언한다.

- [ ] **Step 1: 대시보드 페이지에 Client wrapper + 패널 삽입**

`src/app/(admin)/admin/dashboard/page.tsx` 상단에 `"use client"` 없이, 파일 내에서 별도 Client 컴포넌트를 선언한다. Next.js 15에서는 Server Component 파일 안에 Client Component를 export할 수 없으므로, 파일 최상단에 아래 import를 추가하고 `DashboardAiSection` 컴포넌트를 **같은 파일에 선언하지 말고** 별도 파일로 분리한다.

```typescript
// src/components/admin/dashboard-ai-section.tsx
"use client";

import { AiInsightPanel } from "./ai-insight-panel";

export function DashboardAiSection() {
  async function fetchBrief(): Promise<string | null> {
    const res = await fetch("/api/ai/dashboard-brief", { method: "POST" });
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    return data.result as string | null;
  }

  return (
    <AiInsightPanel
      title="오늘의 AI 브리핑"
      fetchFn={fetchBrief}
      description="오늘의 운영 현황을 AI가 분석하여 핵심 포인트와 위험 신호를 알려드립니다."
    />
  );
}
```

- [ ] **Step 2: 대시보드 페이지에 섹션 삽입 (`analysisEnabled` 조건부 렌더링 포함)**

`src/app/(admin)/admin/dashboard/page.tsx`는 Server Component이므로 `prisma.lLMSettings.findFirst()`를 직접 호출할 수 있다. 파일 상단에 import 추가:

```typescript
import { DashboardAiSection } from "@/components/admin/dashboard-ai-section";
import { prisma } from "@/lib/db/client";
```

페이지 컴포넌트 함수 내부 상단에 추가:
```typescript
const llmSettings = await prisma.lLMSettings.findFirst();
const analysisEnabled = llmSettings?.analysisEnabled ?? false;
```

JSX 내 적절한 위치(기존 통계 카드 `<div className="grid ...">` 바로 위)에 삽입:
```tsx
{analysisEnabled && <DashboardAiSection />}
```

- [ ] **Step 3: 개발 서버에서 확인**

```bash
pnpm dev
```
- AI 활성화 상태에서 `/admin/dashboard` 접속 → "AI 분석" 버튼 표시 확인
- 관리자 설정에서 AI 비활성화 후 새로고침 → 패널 자체가 보이지 않는지 확인

- [ ] **Step 4: 커밋**

```bash
git add src/components/admin/dashboard-ai-section.tsx \
        src/app/(admin)/admin/dashboard/page.tsx
git commit -m "feat: 대시보드에 AI 브리핑 패널 통합"
```

---

## Task 4: 분석 인사이트 — 프롬프트 빌더 + API + 페이지 통합

**Files:**
- Create: `src/lib/ai/analytics-insight.ts`
- Create: `src/app/api/ai/analytics-insight/route.ts`
- Create: `tests/unit/ai/analytics-insight.spec.ts`
- Modify: `src/app/(admin)/admin/analytics/page.tsx` (Server Component 쉘로 변환, `analysisEnabled` prop 전달)
- Rename/Modify: 기존 `page.tsx` 클라이언트 로직을 `analytics-content.tsx`로 분리

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// tests/unit/ai/analytics-insight.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => ({
  prisma: { lLMSettings: { upsert: vi.fn() } },
}));
vi.mock("@/lib/llm/providers/gemini", () => ({ callGemini: vi.fn() }));
vi.mock("@/lib/llm/providers/ollama", () => ({ callOllama: vi.fn() }));

import { generateAnalyticsInsight } from "@/lib/ai/analytics-insight";
import { prisma } from "@/lib/db/client";
import { callGemini } from "@/lib/llm/providers/gemini";

const mockSettings = {
  id: "default", provider: "gemini", analysisEnabled: true,
  geminiApiKey: "k", geminiModel: "gemini-1.5-flash",
  ollamaUrl: "http://localhost:11434", ollamaModel: "llama3.2",
  analysisPrompt: null, createdAt: new Date(), updatedAt: new Date(),
};

const mockMetrics = {
  preset: "30d" as const,
  totalTickets: 120,
  resolvedTickets: 98,
  resolutionRate: 81.7,
  avgFirstResponseMinutes: 32,
  avgResolutionMinutes: 480,
  csatAvg: 4.1,
  csatResponseRate: 62,
  topCategories: [
    { name: "기술 지원", count: 45 },
    { name: "결제 문의", count: 30 },
  ],
  topAgents: [{ name: "김지수", resolved: 28, csatAvg: 4.5 }],
  bottomAgents: [{ name: "이민준", resolved: 5, csatAvg: 3.2 }],
};

beforeEach(() => vi.clearAllMocks());

describe("generateAnalyticsInsight", () => {
  it("analysisEnabled false → null", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue({ ...mockSettings, analysisEnabled: false });
    expect(await generateAnalyticsInsight(mockMetrics)).toBeNull();
  });

  it("LLM 결과 반환", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockResolvedValue("  인사이트 내용  ");
    expect(await generateAnalyticsInsight(mockMetrics)).toBe("인사이트 내용");
  });

  it("LLM 실패 → null", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockRejectedValue(new Error("err"));
    expect(await generateAnalyticsInsight(mockMetrics)).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
pnpm test tests/unit/ai/analytics-insight.spec.ts
```

- [ ] **Step 3: 프롬프트 빌더 구현**

```typescript
// src/lib/ai/analytics-insight.ts
import type { LLMSettings } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { callGemini } from "@/lib/llm/providers/gemini";
import { callOllama } from "@/lib/llm/providers/ollama";

import type { DatePreset } from "@/lib/db/queries/admin-analytics/contracts";

export interface AnalyticsMetrics {
  preset: Exclude<DatePreset, "custom">; // "7d" | "30d" | "90d"
  totalTickets: number;
  resolvedTickets: number;
  resolutionRate: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  csatAvg: number | null;
  csatResponseRate: number | null;
  topCategories: { name: string; count: number }[];
  topAgents: { name: string; resolved: number; csatAvg: number | null }[];
  bottomAgents: { name: string; resolved: number; csatAvg: number | null }[];
}

async function getLlmSettings(): Promise<LLMSettings> {
  return prisma.lLMSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
}

async function runProvider(prompt: string, settings: LLMSettings): Promise<string> {
  const provider = settings.provider.trim().toLowerCase();
  if (provider === "ollama") return callOllama(prompt, settings);
  if (provider === "gemini") return callGemini(prompt, settings);
  throw new Error(`지원하지 않는 LLM provider: ${settings.provider}`);
}

const PRESET_LABELS: Record<string, string> = { "7d": "최근 7일", "30d": "최근 30일", "90d": "최근 90일" };

function buildPrompt(m: AnalyticsMetrics): string {
  const categories = m.topCategories.map((c, i) => `  ${i + 1}. ${c.name}: ${c.count}건`).join("\n");
  const topAgent = m.topAgents[0];
  const bottomAgent = m.bottomAgents[0];

  return `당신은 헬프데스크 분석 전문가입니다. 아래 지표를 분석하여 핵심 인사이트와 개선 권고사항을 서술해주세요.

=== 분석 기간: ${PRESET_LABELS[m.preset] ?? m.preset} ===
- 총 접수 티켓: ${m.totalTickets}건
- 해결 티켓: ${m.resolvedTickets}건 (해결률 ${m.resolutionRate.toFixed(1)}%)
- 평균 첫 응답 시간: ${m.avgFirstResponseMinutes != null ? Math.round(m.avgFirstResponseMinutes) + "분" : "측정 불가"}
- 평균 처리 시간: ${m.avgResolutionMinutes != null ? Math.round(m.avgResolutionMinutes / 60) + "시간" : "측정 불가"}
- CSAT 평균: ${m.csatAvg != null ? m.csatAvg.toFixed(1) + "점" : "데이터 없음"} (응답률 ${m.csatResponseRate != null ? m.csatResponseRate.toFixed(0) + "%" : "-"})

카테고리별 티켓 분포 (상위):
${categories || "  데이터 없음"}

${topAgent ? `성과 우수 상담원: ${topAgent.name} (해결 ${topAgent.resolved}건, CSAT ${topAgent.csatAvg?.toFixed(1) ?? "-"})` : ""}
${bottomAgent ? `개선 필요 상담원: ${bottomAgent.name} (해결 ${bottomAgent.resolved}건, CSAT ${bottomAgent.csatAvg?.toFixed(1) ?? "-"})` : ""}

=== 요청사항 ===
- 단순 수치 나열 금지. 수치의 의미와 원인을 해석하세요.
- 이상치가 있으면 원인을 추론하세요.
- 구체적인 개선 권고사항을 포함하세요.
- 마크다운 없이 평문으로 작성하세요.
- 한국어로 작성하세요.

분석:`;
}

export async function generateAnalyticsInsight(
  metrics: AnalyticsMetrics
): Promise<string | null> {
  const settings = await getLlmSettings();
  if (!settings.analysisEnabled) return null;
  try {
    return (await runProvider(buildPrompt(metrics), settings)).trim();
  } catch (error) {
    console.error("generateAnalyticsInsight failed:", error);
    return null;
  }
}
```

- [ ] **Step 4: 테스트 PASS 확인**

```bash
pnpm test tests/unit/ai/analytics-insight.spec.ts
```

- [ ] **Step 5: API 라우트 구현**

```typescript
// src/app/api/ai/analytics-insight/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { generateAnalyticsInsight, AnalyticsMetrics } from "@/lib/ai/analytics-insight";
import { getPeriodFromPreset } from "@/lib/reports/date-range";
import type { DatePreset } from "@/lib/db/queries/admin-analytics/contracts";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const preset: DatePreset = ["7d", "30d", "90d"].includes(body.preset)
      ? body.preset
      : "30d";

    const { from, to } = getPeriodFromPreset(preset);

    const [totalTickets, resolvedTickets, csatAgg, categories, agentStats] =
      await Promise.all([
        prisma.ticket.count({ where: { createdAt: { gte: from, lte: to } } }),
        prisma.ticket.count({
          where: { createdAt: { gte: from, lte: to }, status: { in: ["RESOLVED", "CLOSED"] } },
        }),
        prisma.cSATResponse.aggregate({
          _avg: { score: true },
          _count: { id: true },
          where: { createdAt: { gte: from, lte: to } },
        }),
        prisma.ticket.groupBy({
          by: ["categoryId"],
          _count: { id: true },
          where: { createdAt: { gte: from, lte: to }, categoryId: { not: null } },
          orderBy: { _count: { id: "desc" } },
          take: 5,
        }),
        prisma.ticket.groupBy({
          by: ["assigneeId"],
          _count: { id: true },
          where: {
            createdAt: { gte: from, lte: to },
            assigneeId: { not: null },
            status: { in: ["RESOLVED", "CLOSED"] },
          },
          orderBy: { _count: { id: "desc" } },
        }),
      ]);

    // 카테고리 이름 조회
    const categoryIds = categories.map((c) => c.categoryId).filter(Boolean) as string[];
    const categoryNames = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = Object.fromEntries(categoryNames.map((c) => [c.id, c.name]));
    const topCategories = categories.map((c) => ({
      name: categoryMap[c.categoryId!] ?? "미분류",
      count: c._count.id,
    }));

    // 상담원 이름 조회
    const agentIds = agentStats.map((a) => a.assigneeId).filter(Boolean) as string[];
    const agentNames = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true },
    });
    const agentMap = Object.fromEntries(agentNames.map((a) => [a.id, a.name]));
    const sortedAgents = agentStats.map((a) => ({
      name: agentMap[a.assigneeId!] ?? "미배정",
      resolved: a._count.id,
      csatAvg: null,
    }));

    const totalSent = await prisma.cSATResponse.count({
      where: { createdAt: { gte: from, lte: to } },
    });
    const totalTicketsForRate = totalTickets || 1;

    const metrics: AnalyticsMetrics = {
      preset,
      totalTickets,
      resolvedTickets,
      resolutionRate: totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0,
      avgFirstResponseMinutes: null,
      avgResolutionMinutes: null,
      csatAvg: csatAgg._avg.score,
      csatResponseRate: (totalSent / totalTicketsForRate) * 100,
      topCategories,
      topAgents: sortedAgents.slice(0, 3),
      bottomAgents: sortedAgents.slice(-3).reverse(),
    };

    const result = await generateAnalyticsInsight(metrics);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("analytics-insight API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 6: 분석 페이지 구조 변경 + 패널 삽입**

`analytics/page.tsx`는 현재 `"use client"` 컴포넌트다. `analysisEnabled`를 서버에서 읽어 전달하기 위해 구조를 분리한다.

**6-1.** 기존 `analytics/page.tsx` 전체 내용을 `analytics-content.tsx`로 이동하고 `analysisEnabled` prop을 추가한다:

```typescript
// src/app/(admin)/admin/analytics/analytics-content.tsx  ← 기존 page.tsx 내용 그대로
"use client";

interface Props {
  analysisEnabled: boolean;
}

export function AnalyticsContent({ analysisEnabled }: Props) {
  // ... 기존 훅, 상태, JSX 전체 유지 ...

  // PRESETS 버튼 div 바로 아래에 조건부 삽입:
  // {analysisEnabled && (
  //   <AiInsightPanel
  //     title="AI 데이터 해석"
  //     fetchFn={() =>
  //       fetch("/api/ai/analytics-insight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preset }) })
  //         .then(async (res) => { if (!res.ok) throw new Error("fetch failed"); return (await res.json()).result as string | null; })
  //     }
  //     description={`현재 선택된 기간(${PRESETS.find((p) => p.value === preset)?.label ?? preset})의 지표를 AI가 해석합니다.`}
  //   />
  // )}
}
```

**6-2.** `analytics/page.tsx`를 Server Component 쉘로 교체:

```typescript
// src/app/(admin)/admin/analytics/page.tsx
import { prisma } from "@/lib/db/client";
import { AnalyticsContent } from "./analytics-content";

export default async function AnalyticsPage() {
  const llmSettings = await prisma.lLMSettings.findFirst();
  const analysisEnabled = llmSettings?.analysisEnabled ?? false;
  return <AnalyticsContent analysisEnabled={analysisEnabled} />;
}
```

- [ ] **Step 7: 커밋**

```bash
git add src/lib/ai/analytics-insight.ts \
        src/app/api/ai/analytics-insight/route.ts \
        tests/unit/ai/analytics-insight.spec.ts \
        src/app/(admin)/admin/analytics/page.tsx \
        src/app/(admin)/admin/analytics/analytics-content.tsx
git commit -m "feat: 분석 AI 인사이트 — 프롬프트 빌더 + API + 페이지 통합"
```

---

## Task 5: 상담원 코칭 — 프롬프트 빌더 + API + 페이지 통합

**Files:**
- Create: `src/lib/ai/agent-coaching.ts`
- Create: `src/app/api/ai/agent-coaching/route.ts`
- Create: `tests/unit/ai/agent-coaching.spec.ts`
- Create: `src/components/admin/agent-ai-section.tsx`
- Modify: `src/app/(admin)/admin/agents/page.tsx`

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// tests/unit/ai/agent-coaching.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => ({ prisma: { lLMSettings: { upsert: vi.fn() } } }));
vi.mock("@/lib/llm/providers/gemini", () => ({ callGemini: vi.fn() }));
vi.mock("@/lib/llm/providers/ollama", () => ({ callOllama: vi.fn() }));

import { generateAgentCoaching } from "@/lib/ai/agent-coaching";
import { prisma } from "@/lib/db/client";
import { callGemini } from "@/lib/llm/providers/gemini";

const mockSettings = {
  id: "default", provider: "gemini", analysisEnabled: true,
  geminiApiKey: "k", geminiModel: "gemini-1.5-flash",
  ollamaUrl: "http://localhost:11434", ollamaModel: "llama3.2",
  analysisPrompt: null, createdAt: new Date(), updatedAt: new Date(),
};

const mockAgents = [
  { name: "김지수", ticketsHandled: 42, resolved: 38, csatAvg: 4.5, avgFirstResponseMinutes: 15, currentTickets: 3, topCategory: "기술 지원" },
  { name: "이민준", ticketsHandled: 12, resolved: 7, csatAvg: 3.1, avgFirstResponseMinutes: 85, currentTickets: 8, topCategory: "결제 문의" },
];

beforeEach(() => vi.clearAllMocks());

describe("generateAgentCoaching", () => {
  it("analysisEnabled false → null", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue({ ...mockSettings, analysisEnabled: false });
    expect(await generateAgentCoaching(mockAgents)).toBeNull();
  });

  it("LLM 결과 반환", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockResolvedValue("  코칭 분석 결과  ");
    expect(await generateAgentCoaching(mockAgents)).toBe("코칭 분석 결과");
  });

  it("LLM 실패 → null", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockRejectedValue(new Error("err"));
    expect(await generateAgentCoaching(mockAgents)).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
pnpm test tests/unit/ai/agent-coaching.spec.ts
```

- [ ] **Step 3: 프롬프트 빌더 구현**

```typescript
// src/lib/ai/agent-coaching.ts
import type { LLMSettings } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { callGemini } from "@/lib/llm/providers/gemini";
import { callOllama } from "@/lib/llm/providers/ollama";

export interface AgentStats {
  name: string;
  ticketsHandled: number;
  resolved: number;
  csatAvg: number | null;
  avgFirstResponseMinutes: number | null;
  currentTickets: number;
  topCategory: string | null;
}

async function getLlmSettings(): Promise<LLMSettings> {
  return prisma.lLMSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
}

async function runProvider(prompt: string, settings: LLMSettings): Promise<string> {
  const provider = settings.provider.trim().toLowerCase();
  if (provider === "ollama") return callOllama(prompt, settings);
  if (provider === "gemini") return callGemini(prompt, settings);
  throw new Error(`지원하지 않는 LLM provider: ${settings.provider}`);
}

function buildPrompt(agents: AgentStats[]): string {
  const agentText = agents.map((a) => [
    `[${a.name}]`,
    `  처리: ${a.ticketsHandled}건, 해결: ${a.resolved}건`,
    `  CSAT: ${a.csatAvg != null ? a.csatAvg.toFixed(1) + "점" : "데이터 없음"}`,
    `  평균 첫 응답: ${a.avgFirstResponseMinutes != null ? Math.round(a.avgFirstResponseMinutes) + "분" : "측정 불가"}`,
    `  현재 배정: ${a.currentTickets}건`,
    `  주요 카테고리: ${a.topCategory ?? "없음"}`,
  ].join("\n")).join("\n\n");

  return `당신은 헬프데스크 팀 매니저 코치입니다. 상담원 성과 데이터를 분석하여 팀 전반의 현황과 구체적인 코칭 포인트를 제시해주세요.

=== 상담원 성과 (최근 30일) ===
${agentText}

=== 요청사항 ===
- 팀 전반의 강점과 약점을 먼저 요약하세요.
- 개선이 필요한 상담원에게는 구체적인 코칭 포인트를 제시하세요.
- 특정 상담원을 지나치게 부정적으로 표현하지 마세요. 건설적이고 발전적인 어조를 유지하세요.
- 마크다운 없이 평문으로 작성하세요.
- 한국어로 작성하세요.

코칭 분석:`;
}

export async function generateAgentCoaching(
  agents: AgentStats[]
): Promise<string | null> {
  const settings = await getLlmSettings();
  if (!settings.analysisEnabled) return null;
  try {
    return (await runProvider(buildPrompt(agents), settings)).trim();
  } catch (error) {
    console.error("generateAgentCoaching failed:", error);
    return null;
  }
}
```

- [ ] **Step 4: 테스트 PASS 확인**

```bash
pnpm test tests/unit/ai/agent-coaching.spec.ts
```

- [ ] **Step 5: API 라우트 구현**

```typescript
// src/app/api/ai/agent-coaching/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { generateAgentCoaching } from "@/lib/ai/agent-coaching";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        assignedTickets: {
          where: { createdAt: { gte: thirtyDaysAgo } },
          select: { id: true, status: true, categoryId: true },
        },
        categories: {
          include: { category: { select: { name: true } } },
          take: 1,
          orderBy: { category: { name: "asc" } },
        },
      },
    });

    const currentCounts = await prisma.ticket.groupBy({
      by: ["assigneeId"],
      _count: { id: true },
      where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] }, assigneeId: { not: null } },
    });
    const currentMap = Object.fromEntries(
      currentCounts.map((c) => [c.assigneeId!, c._count.id])
    );

    const agentStats = agents.map((a) => {
      const resolved = a.assignedTickets.filter((t) =>
        ["RESOLVED", "CLOSED"].includes(t.status)
      ).length;
      return {
        name: a.name,
        ticketsHandled: a.assignedTickets.length,
        resolved,
        csatAvg: null,
        avgFirstResponseMinutes: null,
        currentTickets: currentMap[a.id] ?? 0,
        topCategory: a.categories[0]?.category.name ?? null,
      };
    });

    const result = await generateAgentCoaching(agentStats);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("agent-coaching API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 6: `AgentAiSection` Client wrapper 생성 및 페이지 통합**

`agents/page.tsx`는 Server Component이므로, `fetchFn`에 인라인 화살표 함수를 직접 전달할 수 없다 (Next.js 15 제약). `DashboardAiSection`과 동일한 패턴으로 Client wrapper를 별도 파일로 생성한다.

`src/components/admin/agent-ai-section.tsx` 생성:
```tsx
"use client";

import { AiInsightPanel } from "@/components/admin/ai-insight-panel";

export function AgentAiSection() {
  return (
    <AiInsightPanel
      title="AI 성과 코칭"
      fetchFn={() =>
        fetch("/api/ai/agent-coaching", { method: "POST" }).then(async (res) => {
          if (!res.ok) throw new Error("fetch failed");
          return (await res.json()).result as string | null;
        })
      }
      description="최근 30일 상담원 성과를 분석하여 팀 코칭 포인트를 제안합니다."
    />
  );
}
```

`src/app/(admin)/admin/agents/page.tsx`는 Server Component다. `prisma.lLMSettings.findFirst()`로 `analysisEnabled`를 서버에서 읽어 조건부 렌더링한다.

파일 상단에 import 추가:
```typescript
import { AgentAiSection } from "@/components/admin/agent-ai-section";
import { prisma } from "@/lib/db/client";
```

페이지 컴포넌트 함수 내부 상단에 추가:
```typescript
const llmSettings = await prisma.lLMSettings.findFirst();
const analysisEnabled = llmSettings?.analysisEnabled ?? false;
```

`<AgentList .../>` 바로 위에 삽입:
```tsx
{isAdmin && analysisEnabled && <AgentAiSection />}
```

- [ ] **Step 7: 커밋**

```bash
git add src/lib/ai/agent-coaching.ts \
        src/app/api/ai/agent-coaching/route.ts \
        tests/unit/ai/agent-coaching.spec.ts \
        src/components/admin/agent-ai-section.tsx \
        src/app/(admin)/admin/agents/page.tsx
git commit -m "feat: 상담원 AI 성과 코칭 — 프롬프트 빌더 + API + 페이지 통합"
```

---

## Task 6: 감사 로그 이상탐지 — 프롬프트 빌더 + API + 컴포넌트 통합

**Files:**
- Create: `src/lib/ai/audit-anomaly.ts`
- Create: `src/app/api/ai/audit-anomaly/route.ts`
- Create: `tests/unit/ai/audit-anomaly.spec.ts`
- Modify: `src/components/admin/audit-log-list.tsx` (`analysisEnabled` prop 추가)
- Modify: `src/app/(admin)/admin/audit-logs/page.tsx` (`analysisEnabled` 전달)

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// tests/unit/ai/audit-anomaly.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => ({ prisma: { lLMSettings: { upsert: vi.fn() } } }));
vi.mock("@/lib/llm/providers/gemini", () => ({ callGemini: vi.fn() }));
vi.mock("@/lib/llm/providers/ollama", () => ({ callOllama: vi.fn() }));

import { generateAuditAnomalyReport } from "@/lib/ai/audit-anomaly";
import { prisma } from "@/lib/db/client";
import { callGemini } from "@/lib/llm/providers/gemini";

const mockSettings = {
  id: "default", provider: "gemini", analysisEnabled: true,
  geminiApiKey: "k", geminiModel: "gemini-1.5-flash",
  ollamaUrl: "http://localhost:11434", ollamaModel: "llama3.2",
  analysisPrompt: null, createdAt: new Date(), updatedAt: new Date(),
};

const mockLogs = [
  { actorName: "김관리자", actorEmail: "admin@test.com", action: "DELETE", resourceType: "Ticket", resourceId: "t1", description: "티켓 삭제", createdAt: "2026-03-22T03:17:00Z" },
  { actorName: "김관리자", actorEmail: "admin@test.com", action: "DELETE", resourceType: "Ticket", resourceId: "t2", description: "티켓 삭제", createdAt: "2026-03-22T03:18:00Z" },
];

beforeEach(() => vi.clearAllMocks());

describe("generateAuditAnomalyReport", () => {
  it("analysisEnabled false → null", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue({ ...mockSettings, analysisEnabled: false });
    expect(await generateAuditAnomalyReport(mockLogs)).toBeNull();
  });

  it("LLM 결과 반환", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockResolvedValue("  이상 패턴 감지됨  ");
    expect(await generateAuditAnomalyReport(mockLogs)).toBe("이상 패턴 감지됨");
  });

  it("LLM 실패 → null", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockRejectedValue(new Error("err"));
    expect(await generateAuditAnomalyReport(mockLogs)).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
pnpm test tests/unit/ai/audit-anomaly.spec.ts
```

- [ ] **Step 3: 프롬프트 빌더 구현**

```typescript
// src/lib/ai/audit-anomaly.ts
import type { LLMSettings } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { callGemini } from "@/lib/llm/providers/gemini";
import { callOllama } from "@/lib/llm/providers/ollama";

export interface AuditLogEntry {
  actorName: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  description: string;
  createdAt: string;
}

async function getLlmSettings(): Promise<LLMSettings> {
  return prisma.lLMSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
}

async function runProvider(prompt: string, settings: LLMSettings): Promise<string> {
  const provider = settings.provider.trim().toLowerCase();
  if (provider === "ollama") return callOllama(prompt, settings);
  if (provider === "gemini") return callGemini(prompt, settings);
  throw new Error(`지원하지 않는 LLM provider: ${settings.provider}`);
}

function buildPrompt(logs: AuditLogEntry[]): string {
  const logText = logs.map((l) =>
    `[${l.createdAt}] ${l.actorName}(${l.actorEmail}) — ${l.action} ${l.resourceType}${l.resourceId ? " " + l.resourceId : ""}: ${l.description}`
  ).join("\n");

  return `당신은 보안 감사 전문가입니다. 아래 시스템 감사 로그를 분석하여 이상 패턴을 탐지해주세요.

=== 감사 로그 (최대 100건) ===
${logText}

=== 탐지 기준 ===
- 짧은 시간 내 동일 행위자의 대량 액션 (5건 이상/10분)
- 비업무 시간대(새벽 0~6시) 집중 활동
- 반복적인 삭제 또는 권한 변경
- 동일 리소스에 대한 반복 접근
- 기타 비정상적으로 보이는 패턴

=== 요청사항 ===
- 이상 패턴이 있으면 구체적으로 설명하세요 (누가, 언제, 무엇을, 왜 의심스러운지).
- 이상 패턴이 없으면 "특이 패턴이 감지되지 않았습니다."라고만 작성하세요.
- 마크다운 없이 평문으로 작성하세요.
- 한국어로 작성하세요.

분석 결과:`;
}

export async function generateAuditAnomalyReport(
  logs: AuditLogEntry[]
): Promise<string | null> {
  const settings = await getLlmSettings();
  if (!settings.analysisEnabled) return null;
  try {
    return (await runProvider(buildPrompt(logs), settings)).trim();
  } catch (error) {
    console.error("generateAuditAnomalyReport failed:", error);
    return null;
  }
}
```

- [ ] **Step 4: 테스트 PASS 확인**

```bash
pnpm test tests/unit/ai/audit-anomaly.spec.ts
```

- [ ] **Step 5: API 라우트 구현**

```typescript
// src/app/api/ai/audit-anomaly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { generateAuditAnomalyReport } from "@/lib/ai/audit-anomaly";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { search, action, resourceType, startDate, endDate } = body;

    const where: any = {};
    if (search) {
      where.OR = [
        { actorName: { contains: search } },
        { actorEmail: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (action && action !== "ALL") where.action = action;
    if (resourceType && resourceType !== "ALL") where.resourceType = resourceType;
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        actorName: true,
        actorEmail: true,
        action: true,
        resourceType: true,
        resourceId: true,
        description: true,
        createdAt: true,
        // oldValue, newValue 제외 (민감 데이터)
      },
    });

    const entries = logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    }));

    const result = await generateAuditAnomalyReport(entries);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("audit-anomaly API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 6: `AuditLogList`에 `analysisEnabled` prop 추가 + 패널 삽입**

`AuditLogList`는 Client Component다. 부모 Server Component(`admin/audit-logs/page.tsx`)에서 `analysisEnabled`를 읽어 prop으로 전달한다.

**6-1.** `src/components/admin/audit-log-list.tsx`에 prop 추가 및 패널 삽입:

```typescript
import { AiInsightPanel } from "./ai-insight-panel";

interface AuditLogListProps {
  // ... 기존 props ...
  analysisEnabled: boolean;  // 추가
}

export function AuditLogList({ ..., analysisEnabled }: AuditLogListProps) {
  // ... 기존 코드 ...

  // 로그 테이블 바로 위에 조건부 삽입:
  // {analysisEnabled && (
  //   <AiInsightPanel
  //     title="AI 이상 패턴 탐지"
  //     fetchFn={() =>
  //       fetch("/api/ai/audit-anomaly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ search, action, resourceType, startDate, endDate }) })
  //         .then(async (res) => { if (!res.ok) throw new Error("fetch failed"); return (await res.json()).result as string | null; })
  //     }
  //     description="현재 필터 조건의 감사 로그에서 비정상 패턴을 AI가 탐지합니다."
  //   />
  // )}
}
```

**6-2.** `src/app/(admin)/admin/audit-logs/page.tsx` (Server Component)에서 `analysisEnabled` 읽어 전달:

```typescript
import { prisma } from "@/lib/db/client";

// 페이지 함수 내부:
const llmSettings = await prisma.lLMSettings.findFirst();
const analysisEnabled = llmSettings?.analysisEnabled ?? false;

// JSX:
<AuditLogList ... analysisEnabled={analysisEnabled} />
```

- [ ] **Step 7: 커밋**

```bash
git add src/lib/ai/audit-anomaly.ts \
        src/app/api/ai/audit-anomaly/route.ts \
        tests/unit/ai/audit-anomaly.spec.ts \
        src/components/admin/audit-log-list.tsx \
        src/app/(admin)/admin/audit-logs/page.tsx
git commit -m "feat: 감사 로그 AI 이상탐지 — 프롬프트 빌더 + API + 컴포넌트 통합"
```

---

## Task 7: 전체 테스트 + 타입 체크

- [ ] **Step 1: 유닛 테스트 전체 실행**

```bash
pnpm test
```
Expected: 기존 67개 + 신규 12개 = 79개 이상 PASS

- [ ] **Step 2: 타입 체크**

```bash
pnpm tsc --noEmit 2>&1 | grep -v ".next/types"
```
Expected: 수정한 파일 관련 에러 없음

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git commit -m "chore: AI 인사이트 패널 전체 구현 완료"
git push origin master
```
