"use client";

import { AiInsightPanel } from "@/components/admin/ai-insight-panel";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";

export function DashboardAiSection() {
  const copy = useAdminCopy() as unknown as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;

  async function fetchBrief(): Promise<string | null> {
    const res = await fetch("/api/ai/dashboard-brief", { method: "POST" });
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    return data.result as string | null;
  }

  return (
    <AiInsightPanel
      title={t("dashboardAiBriefingTitle", "오늘의 AI 브리핑")}
      fetchFn={fetchBrief}
      description={t("dashboardAiBriefingDesc", "오늘의 운영 현황을 AI가 분석하여 핵심 포인트와 위험 신호를 알려드립니다.")}
    />
  );
}
