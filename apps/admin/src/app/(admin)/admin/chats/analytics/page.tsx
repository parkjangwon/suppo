import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@crinity/db";
import {
  buildChatAgentPerformance,
  buildChatOperationsSummary,
  getChatSlaState,
} from "@crinity/shared/chat/metrics";
import { ensureChatWidgetSettings } from "@crinity/shared/chat/widget-settings";
import { Button } from "@crinity/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";

import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function ChatAnalyticsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const settings = await ensureChatWidgetSettings();
  const conversations = await prisma.chatConversation.findMany({
    include: {
      ticket: {
        select: {
          id: true,
          ticketNumber: true,
          customerName: true,
          customerEmail: true,
          subject: true,
          assignee: {
            select: { id: true, name: true },
          },
          comments: {
            select: {
              authorType: true,
              createdAt: true,
            },
          },
        },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });
  const metricConversations = conversations.map((conversation) => ({
    ...conversation,
    comments: conversation.ticket.comments,
  }));

  const summary = buildChatOperationsSummary(metricConversations, settings, new Date());
  const agentPerformance = buildChatAgentPerformance(metricConversations);
  const riskyConversations = metricConversations
    .map((conversation) => ({
      ...conversation,
      slaState: getChatSlaState(conversation, settings, new Date()),
    }))
    .filter((conversation) => conversation.slaState !== "healthy")
    .slice(0, 10);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">채팅 분석</h1>
          <p className="mt-1 text-sm text-muted-foreground">실시간 채팅 운영 지표와 SLA 위험 대화를 확인합니다.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/chats">채팅 큐로 돌아가기</Link>
        </Button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard title="전체 대화" value={summary.total} />
        <StatCard title="평균 첫 응답" value={summary.avgFirstResponseMinutes != null ? `${Math.round(summary.avgFirstResponseMinutes)}분` : "-"} />
        <StatCard title="평균 대화 길이" value={summary.avgConversationMinutes != null ? `${Math.round(summary.avgConversationMinutes)}분` : "-"} />
        <StatCard title="SLA 초과" value={summary.slaBreached} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SLA 위험 대화</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {riskyConversations.length === 0 ? (
            <div className="text-sm text-muted-foreground">현재 SLA 위험 대화가 없습니다.</div>
          ) : (
            riskyConversations.map((conversation) => (
              <div key={conversation.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{conversation.ticket.customerName} · {conversation.ticket.ticketNumber}</div>
                    <div className="text-sm text-muted-foreground">{conversation.ticket.subject}</div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/chats/${conversation.id}`}>열기</Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>상담원별 채팅 성과</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {agentPerformance.length === 0 ? (
            <div className="text-sm text-muted-foreground">성과 데이터가 없습니다.</div>
          ) : (
            agentPerformance.map((agent) => (
              <div key={agent.agentId} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{agent.agentName}</div>
                  <div className="text-sm text-muted-foreground">
                    처리 {agent.conversationsHandled}건 · 종료 {agent.endedConversations}건
                  </div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  평균 첫 응답: {agent.avgFirstResponseMinutes != null ? `${Math.round(agent.avgFirstResponseMinutes)}분` : "-"} ·
                  평균 대화 길이: {agent.avgConversationMinutes != null ? `${Math.round(agent.avgConversationMinutes)}분` : "-"}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{title}</div>
      </CardContent>
    </Card>
  );
}
