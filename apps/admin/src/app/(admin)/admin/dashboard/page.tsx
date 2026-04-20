import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { DashboardAiSection } from "@/components/admin/dashboard-ai-section";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";
import { copyText } from "@/lib/i18n/admin-copy-utils";
import { getAnalysisEnabled } from "@/lib/settings/get-analysis-enabled";

export const metadata: Metadata = {
  title: "운영 대시보드 | Suppo",
};

export default async function DashboardPage() {
  const session = await auth();
  const copy = getAdminCopy((await cookies()).get("suppo-admin-locale")?.value);

  if (!session?.user) {
    redirect("/admin/login");
  }

  const analysisEnabled = await getAnalysisEnabled();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [
    todayCount,
    weekCount,
    monthCount,
    statusCounts,
    priorityCounts,
    agentStats,
    slaBreaches,
  ] = await Promise.all([
    prisma.ticket.count({ where: { createdAt: { gte: today } } }),
    prisma.ticket.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.ticket.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.ticket.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.ticket.groupBy({ by: ["priority"], _count: { id: true } }),
    prisma.agent.findMany({
      where: { isActive: true },
      include: {
        assignedTickets: {
          where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } },
          select: { id: true },
        },
      },
    }),
    prisma.sLAClock.count({ where: { breachedAt: { not: null }, status: { in: ["RUNNING", "PAUSED"] } } }),
  ]);

  const statusLabels: Record<string, string> = {
    OPEN: "접수",
    IN_PROGRESS: "진행중",
    WAITING: "대기중",
    RESOLVED: "해결됨",
    CLOSED: "종료",
  };

  const priorityLabels: Record<string, string> = {
    URGENT: copyText(copy, "ticketsPriorityUrgent", "긴급"),
    HIGH: copyText(copy, "ticketsPriorityHigh", "높음"),
    MEDIUM: copyText(copy, "ticketsPriorityMedium", "보통"),
    LOW: copyText(copy, "ticketsPriorityLow", "낮음"),
  };

  const openCount = statusCounts
    .filter((s: { status: string }) => ["OPEN", "IN_PROGRESS", "WAITING"].includes(s.status))
    .reduce((acc: number, s: { _count: { id: number } }) => acc + s._count.id, 0);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{copyText(copy, "dashboardTitle", "운영 대시보드")}</h1>

      {analysisEnabled && <DashboardAiSection />}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{todayCount}</div>
            <div className="text-sm text-gray-600">{copyText(copy, "dashboardTodayNew", "오늘 신규")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{weekCount}</div>
            <div className="text-sm text-gray-600">{copyText(copy, "dashboardLast7Days", "최근 7일")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{monthCount}</div>
            <div className="text-sm text-gray-600">{copyText(copy, "dashboardLast30Days", "최근 30일")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-red-600">{slaBreaches}</div>
            <div className="text-sm text-gray-600">{copyText(copy, "dashboardSlaBreaches", "SLA 위반")}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{copyText(copy, "dashboardStatusBy", "상태별")} ({openCount} {copyText(copy, "dashboardOpenCountLabel", "오픈")})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statusCounts.map((item: { status: string; _count: { id: number } }) => (
                <div key={item.status} className="flex justify-between">
                  <span>{statusLabels[item.status] || item.status}</span>
                  <span className="font-bold">{item._count.id}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{copyText(copy, "dashboardPriorityBy", "우선순위별")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {priorityCounts.map((item: { priority: string; _count: { id: number } }) => (
                <div key={item.priority} className="flex justify-between">
                  <span>{priorityLabels[item.priority] || item.priority}</span>
                  <span className="font-bold">{item._count.id}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{copyText(copy, "dashboardOpenTicketsByAgent", "상담원별 오픈 티켓")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {agentStats.map((agent: { id: string; name: string; assignedTickets: { id: string }[] }) => (
                <div key={agent.id} className="flex justify-between">
                  <span>{agent.name}</span>
                  <span className="font-bold">{agent.assignedTickets.length}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
