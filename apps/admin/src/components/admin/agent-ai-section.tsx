"use client";

import { AiInsightPanel } from "@/components/admin/ai-insight-panel";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";

export function AgentAiSection() {
  const copy = useAdminCopy() as unknown as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;

  return (
    <AiInsightPanel
      title={t("agentAiCoachingTitle", "AI 성과 코칭")}
      fetchFn={() =>
        fetch("/api/ai/agent-coaching", { method: "POST" }).then(
          async (res) => {
            if (!res.ok) throw new Error("fetch failed");
            return (await res.json()).result as string | null;
          },
        )
      }
      description={t("agentAiCoachingDesc", "최근 30일 상담원 성과를 분석하여 팀 코칭 포인트를 제안합니다.")}
    />
  );
}
