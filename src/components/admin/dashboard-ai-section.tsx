"use client";

import { AiInsightPanel } from "@/components/admin/ai-insight-panel";

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
