"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@crinity/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@crinity/ui/components/ui/tabs";
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
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">분석 및 리포트</h1>

        <div className="flex gap-2">
          {PRESETS.map((p) => (
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
          title="AI 데이터 해석"
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
            PRESETS.find((p) => p.value === preset)?.label ?? preset
          })의 지표를 AI가 해석합니다.`}
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
            <KPICard title="총 티켓" value={data.kpi.totalTickets} />
            <KPICard
              title="평균 첫 응답"
              value={
                data.kpi.avgFirstResponseMinutes
                  ? `${Math.round(data.kpi.avgFirstResponseMinutes)}분`
                  : "-"
              }
            />
            <KPICard
              title="평균 해결 시간"
              value={
                data.kpi.avgResolutionHours
                  ? `${Math.round(data.kpi.avgResolutionHours)}시간`
                  : "-"
              }
            />
            <KPICard
              title="고객 만족도 평균"
              value={data.kpi.avgCsat ? data.kpi.avgCsat.toFixed(1) : "-"}
            />
            <KPICard title="반복 고객" value={data.kpi.repeatCustomers} />
            <KPICard title="VIP 고객" value={data.kpi.vipCustomers} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <ActionCard
              title="응답 지연 확인"
              description="열린 티켓을 빠르게 점검하고 밀린 문의를 먼저 처리합니다."
              href="/admin/tickets?status=OPEN"
              actionLabel="열린 티켓 보기"
              icon={Clock3}
            />
            <ActionCard
              title="긴급 티켓 우선 처리"
              description="우선순위가 높은 티켓을 먼저 확인해 SLA 위험을 낮춥니다."
              href="/admin/tickets?priority=URGENT"
              actionLabel="긴급 티켓 보기"
              icon={Siren}
            />
            <ActionCard
              title="반복 고객 점검"
              description={`현재 기간에 반복 고객 ${data.kpi.repeatCustomers}명이 집계되었습니다.`}
              href={isAdmin ? "/admin/customers" : "/admin/tickets"}
              actionLabel={isAdmin ? "고객 목록 보기" : "관련 티켓 보기"}
              icon={Repeat2}
            />
            <ActionCard
              title="VIP 고객 확인"
              description={`현재 기간에 VIP 고객 ${data.kpi.vipCustomers}명이 집계되었습니다.`}
              href={isAdmin ? "/admin/customers" : "/admin/tickets"}
              actionLabel={isAdmin ? "VIP 고객 보기" : "관련 티켓 보기"}
              icon={Crown}
            />
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="agents">상담원</TabsTrigger>
              <TabsTrigger value="customers">고객</TabsTrigger>
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
