"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CustomerInsightsResponse } from "@/lib/db/queries/admin-analytics/contracts";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface CustomerInsightsPanelProps {
  customerId: string;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const STATUS_LABELS: Record<string, string> = {
  OPEN: "열림",
  IN_PROGRESS: "진행중",
  WAITING: "대기중",
  RESOLVED: "해결됨",
  CLOSED: "종료",
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-green-500",
};

export function CustomerInsightsPanel({ customerId }: CustomerInsightsPanelProps) {
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
          <div className="text-center text-muted-foreground">불러오는 중...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">데이터를 불러올 수 없습니다</div>
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
        <StatCard title="총 티켓" value={data.stats.totalTickets} />
        <StatCard title="오픈 티켓" value={data.stats.openTickets} />
        <StatCard title="해결됨" value={data.stats.resolvedTickets} />
        <StatCard
          title="CSAT"
          value={data.stats.avgCsat ? data.stats.avgCsat.toFixed(1) : "-"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">평균 첫 응답:</span>
            <span>
              {data.stats.avgFirstResponseMinutes
                ? `${Math.round(data.stats.avgFirstResponseMinutes)}분`
                : "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">평균 해결 시간:</span>
            <span>
              {data.stats.avgResolutionHours
                ? `${Math.round(data.stats.avgResolutionHours)}시간`
                : "-"}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">CSAT 응답 수:</span>
            <span>{data.stats.csatResponses}건</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">마지막 티켓:</span>
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
            <CardTitle className="text-base">카테고리 분포</CardTitle>
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
                  <Tooltip formatter={(value, name) => [`${value}건`, name]} />
                  <Legend fontSize={12} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 티켓</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>티켓 번호</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>우선순위</TableHead>
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
                    티켓이 없습니다
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
