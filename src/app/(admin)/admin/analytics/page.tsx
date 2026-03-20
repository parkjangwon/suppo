"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { DatePreset } from "@/lib/db/queries/admin-analytics/contracts";
import { AgentPerformanceTable } from "@/components/admin/analytics/tables/agent-performance-table";
import { CategoryFrequencyChart } from "@/components/admin/analytics/charts/category-frequency-chart";
import { CSATTrendChart } from "@/components/admin/analytics/charts/csat-trend-chart";
import { RepeatInquiriesTable } from "@/components/admin/analytics/tables/repeat-inquiries-table";
import { VIPCustomersTable } from "@/components/admin/analytics/tables/vip-customers-table";
import { useAnalyticsData } from "./use-analytics-data";

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "7d", label: "최근 7일" },
  { value: "30d", label: "최근 30일" },
  { value: "90d", label: "최근 90일" },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<DatePreset>("30d");
  const { data, isLoading } = useAnalyticsData(preset);

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
              value={data.kpi.avgFirstResponseMinutes ? `${Math.round(data.kpi.avgFirstResponseMinutes)}분` : "-"} 
            />
            <KPICard 
              title="평균 해결 시간" 
              value={data.kpi.avgResolutionHours ? `${Math.round(data.kpi.avgResolutionHours)}시간` : "-"} 
            />
            <KPICard 
              title="CSAT 평균" 
              value={data.kpi.avgCsat ? data.kpi.avgCsat.toFixed(1) : "-"} 
            />
            <KPICard title="반복 고객" value={data.kpi.repeatCustomers} />
            <KPICard title="VIP 고객" value={data.kpi.vipCustomers} />
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
                <CategoryFrequencyChart data={data.categoryFrequency.categories} />
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
