"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { Button } from "@suppo/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@suppo/ui/components/ui/tabs";
import { useSession } from "next-auth/react";
import { DatePreset } from "@/lib/db/queries/admin-analytics/contracts";
import { CategoryFrequencyChart } from "@/components/admin/analytics/charts/category-frequency-chart";
import { CSATTrendChart } from "@/components/admin/analytics/charts/csat-trend-chart";
import { AgentPerformanceTable } from "@/components/admin/analytics/tables/agent-performance-table";
import { RepeatInquiriesTable } from "@/components/admin/analytics/tables/repeat-inquiries-table";
import { VIPCustomersTable } from "@/components/admin/analytics/tables/vip-customers-table";
import { useAnalyticsData } from "./use-analytics-data";
import { AiInsightPanel } from "@/components/admin/ai-insight-panel";
import { ArrowRight, Clock3, Crown, Repeat2, Siren } from "lucide-react";
import { copyText } from "@/lib/i18n/admin-copy-utils";

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "7d", label: "최근 7일" },
  { value: "30d", label: "최근 30일" },
  { value: "90d", label: "최근 90일" },
];

interface Props {
  analysisEnabled: boolean;
}

export function AnalyticsContent({ analysisEnabled }: Props) {
  const [preset, setPreset] = useState<DatePreset>("30d");
  const { data, isLoading } = useAnalyticsData(preset);
  const { data: session } = useSession();
  const copy = useAdminCopy();
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy, key, copy.locale === "en" ? (en ?? ko) : ko);
  const isAdmin = session?.user?.role === "ADMIN";
  const presets = PRESETS.map((preset) => ({
    ...preset,
    label:
      preset.value === "7d"
        ? t("dashboardLast7Days", "최근 7일", "Last 7 days")
        : preset.value === "30d"
        ? t("dashboardLast30Days", "최근 30일", "Last 30 days")
        : t("analyticsLast90Days", "최근 90일", "Last 90 days"),
  }));

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t("navAnalytics", "분석 및 리포트", "Analytics & Reports")}</h1>

        <div className="flex gap-2">
          {presets.map((p) => (
            <Button
              key={p.value}
              variant={preset === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPreset(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {analysisEnabled && (
        <AiInsightPanel
          title={t("analyticsAiInsightTitle", "AI 데이터 해석", "AI Insights")}
          fetchFn={() =>
            fetch("/api/ai/analytics-insight", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ preset }),
            })
              .then(async (res) => {
                if (!res.ok) throw new Error("fetch failed");
                return (await res.json()).result as string | null;
              })
          }
          description={`현재 선택된 기간(${
            presets.find((p) => p.value === preset)?.label ?? preset
          })${copy.locale === "en" ? " metrics interpreted by AI." : "의 지표를 AI가 해석합니다."}`}
        />
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : data ? (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <KPICard title={t("analyticsTotalTickets", "총 티켓", "Total tickets")} value={data.kpi.totalTickets} />
            <KPICard
              title={t("analyticsAverageFirstResponse", "평균 첫 응답", "Avg. first response")}
              value={
                data.kpi.avgFirstResponseMinutes
                  ? `${Math.round(data.kpi.avgFirstResponseMinutes)}${copy.locale === "en" ? "m" : "분"}`
                  : "-"
              }
            />
            <KPICard
              title={t("analyticsAverageResolutionTime", "평균 해결 시간", "Avg. resolution time")}
              value={
                data.kpi.avgResolutionHours
                  ? `${Math.round(data.kpi.avgResolutionHours)}${copy.locale === "en" ? "h" : "시간"}`
                  : "-"
              }
            />
            <KPICard
              title={t("analyticsAverageCsat", "고객 만족도 평균", "Avg. CSAT")}
              value={data.kpi.avgCsat ? data.kpi.avgCsat.toFixed(1) : "-"}
            />
            <KPICard title={t("analyticsRepeatCustomers", "반복 고객", "Repeat customers")} value={data.kpi.repeatCustomers} />
            <KPICard title={t("analyticsVipCustomers", "VIP 고객", "VIP customers")} value={data.kpi.vipCustomers} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <ActionCard
              title={t("helpdeskSlaTitle", "응답 지연 확인", "Response delay check")}
              description={t("helpdeskSlaDescription", "열린 티켓을 빠르게 점검하고 밀린 문의를 먼저 처리합니다.", "Review open tickets quickly and handle the backlog first.")}
              href="/admin/tickets?status=OPEN"
              actionLabel={t("analyticsOpenTicketsAction", "열린 티켓 보기", "View open tickets")}
              icon={Clock3}
            />
            <ActionCard
              title={t("analyticsUrgentTicketsTitle", "긴급 티켓 우선 처리", "Prioritize urgent tickets")}
              description={t("analyticsUrgentTicketsDescription", "우선순위가 높은 티켓을 먼저 확인해 SLA 위험을 낮춥니다.", "Review high-priority tickets first to reduce SLA risk.")}
              href="/admin/tickets?priority=URGENT"
              actionLabel={t("analyticsUrgentTicketsAction", "긴급 티켓 보기", "View urgent tickets")}
              icon={Siren}
            />
            <ActionCard
              title={t("analyticsRepeatCustomerReviewTitle", "반복 고객 점검", "Review repeat customers")}
              description={copy.locale === "en" ? `${data.kpi.repeatCustomers} repeat customers were counted for the selected period.` : `현재 기간에 반복 고객 ${data.kpi.repeatCustomers}명이 집계되었습니다.`}
              href={isAdmin ? "/admin/customers" : "/admin/tickets"}
              actionLabel={isAdmin ? t("analyticsViewCustomers", "고객 목록 보기", "View customers") : t("analyticsViewRelatedTickets", "관련 티켓 보기", "View related tickets")}
              icon={Repeat2}
            />
            <ActionCard
              title={t("analyticsVipCustomerReviewTitle", "VIP 고객 확인", "Review VIP customers")}
              description={copy.locale === "en" ? `${data.kpi.vipCustomers} VIP customers were counted for the selected period.` : `현재 기간에 VIP 고객 ${data.kpi.vipCustomers}명이 집계되었습니다.`}
              href={isAdmin ? "/admin/customers" : "/admin/tickets"}
              actionLabel={isAdmin ? t("analyticsViewVipCustomers", "VIP 고객 보기", "View VIP customers") : t("analyticsViewRelatedTickets", "관련 티켓 보기", "View related tickets")}
              icon={Crown}
            />
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">{t("analyticsTabOverview", "개요", "Overview")}</TabsTrigger>
              <TabsTrigger value="agents">{t("analyticsTabAgents", "상담원", "Agents")}</TabsTrigger>
              <TabsTrigger value="customers">{t("analyticsTabCustomers", "고객", "Customers")}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CSATTrendChart data={data.csatTrend} />
                <CategoryFrequencyChart data={data.categoryFrequency} />
              </div>
            </TabsContent>

            <TabsContent value="agents" className="space-y-6">
              <AgentPerformanceTable preset={preset} />
            </TabsContent>

            <TabsContent value="customers" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RepeatInquiriesTable preset={preset} />
                <VIPCustomersTable preset={preset} />
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}

function KPICard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-gray-600">{title}</div>
      </CardContent>
    </Card>
  );
}

function ActionCard({
  title,
  description,
  href,
  actionLabel,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  icon: typeof Clock3;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href={href}>
            {actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
