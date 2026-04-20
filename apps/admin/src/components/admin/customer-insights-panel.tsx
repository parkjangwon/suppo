"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@suppo/ui/components/ui/table";
import { Badge } from "@suppo/ui/components/ui/badge";
import Link from "next/link";
import { CustomerInsightsResponse } from "@/lib/db/queries/admin-analytics/contracts";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { copyText } from "@/lib/i18n/admin-copy-utils";

interface CustomerInsightsPanelProps {
  customerId: string;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-green-500",
};

export function CustomerInsightsPanel({ customerId }: CustomerInsightsPanelProps) {
  const copy = useAdminCopy();
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy, key, copy.locale === "en" ? (en ?? ko) : ko);
  const STATUS_LABELS: Record<string, string> = {
    OPEN: t("ticketStatusOpen", "열림", "Open"),
    IN_PROGRESS: t("ticketStatusInProgress", "진행중", "In progress"),
    WAITING: t("ticketStatusWaiting", "대기중", "Waiting"),
    RESOLVED: t("ticketStatusResolved", "해결됨", "Resolved"),
    CLOSED: t("ticketStatusClosed", "종료", "Closed"),
  };
  const [data, setData] = useState<CustomerInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/customers/${customerId}/analytics`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch customer insights:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [customerId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">{t("commonLoading", "로딩 중...")}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">{t("commonNotFound", "찾을 수 없습니다")}</div>
        </CardContent>
      </Card>
    );
  }

  const categoryChartData = data.categoryBreakdown.slice(0, 6).map((cat) => ({
    name: cat.categoryName,
    value: cat.ticketCount,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title={t("customersTotalTickets", "총 문의")} value={data.stats.totalTickets} />
        <StatCard title={t("ticketStatusOpen", "열림")} value={data.stats.openTickets} />
        <StatCard title={t("ticketStatusResolved", "해결됨")} value={data.stats.resolvedTickets} />
        <StatCard
          title={t("customersCsat", "고객 만족도")}
          value={data.stats.avgCsat ? data.stats.avgCsat.toFixed(1) : "-"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("analyticsAverageFirstResponse", "평균 첫 응답", "Avg. first response")}:</span>
            <span>
              {data.stats.avgFirstResponseMinutes
                ? `${Math.round(data.stats.avgFirstResponseMinutes)}${copy.locale === "en" ? "m" : "분"}`
                : "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("analyticsAverageResolutionTime", "평균 해결 시간", "Avg. resolution time")}:</span>
            <span>
              {data.stats.avgResolutionHours
                ? `${Math.round(data.stats.avgResolutionHours)}${copy.locale === "en" ? "h" : "시간"}`
                : "-"}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("analyticsCsatResponseCount", "고객 만족도 응답 수", "CSAT responses")}:</span>
            <span>{data.stats.csatResponses}{copy.locale === "en" ? "" : "건"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("analyticsLastTicket", "마지막 티켓", "Last ticket")}:</span>
            <span>
              {data.stats.lastTicketAt
                ? new Date(data.stats.lastTicketAt).toLocaleDateString("ko-KR")
                : "-"}
            </span>
          </div>
        </div>
      </div>

      {categoryChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("analyticsCategoryDistributionTitle", "카테고리 분포", "Category distribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [copy.locale === "en" ? `${value} tickets` : `${value}건`, name]} />
                  <Legend fontSize={12} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("analyticsRecentTickets", "최근 티켓", "Recent tickets")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("ticketsTitle", "티켓 번호", "Ticket")}</TableHead>
                <TableHead>{t("ticketDetailTitle", "제목", "Title")}</TableHead>
                <TableHead>{t("ticketDetailStatus", "상태", "Status")}</TableHead>
                <TableHead>{t("ticketDetailPriority", "우선순위", "Priority")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.tickets.slice(0, 5).map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <Link
                      href={`/admin/tickets/${ticket.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {ticket.ticketNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {STATUS_LABELS[ticket.status] || ticket.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          PRIORITY_COLORS[ticket.priority] || "bg-gray-400"
                        }`}
                      />
                      <span className="text-sm">{ticket.priority}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {data.tickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {t("commonNotFound", "찾을 수 없습니다")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-2">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-gray-600">{title}</div>
      </CardContent>
    </Card>
  );
}
