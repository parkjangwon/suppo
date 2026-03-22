"use client";

import { AiInsightPanel } from "@/components/admin/ai-insight-panel";

export function AgentAiSection() {
  return (
    <AiInsightPanel
      title="AI 성과 코칭"
      fetchFn={() =>
        fetch("/api/ai/agent-coaching", { method: "POST" }).then(
          async (res) => {
            if (!res.ok) throw new Error("fetch failed");
            return (await res.json()).result as string | null;
          },
        )
      }
      description="최근 30일 상담원 성과를 분석하여 팀 코칭 포인트를 제안합니다."
    />
  );
}
