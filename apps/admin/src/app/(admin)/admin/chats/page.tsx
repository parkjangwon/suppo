import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@crinity/db";
import { buildChatOperationsSummary, getChatSlaState } from "@crinity/shared/chat/metrics";
import { ensureChatWidgetSettings } from "@crinity/shared/chat/widget-settings";
import { Button } from "@crinity/ui/components/ui/button";

import { auth } from "@/auth";
import { ChatQueue } from "@/components/admin/chat-queue";
import { ChatSavedViewsBar } from "@/components/admin/chat-saved-views-bar";

export const dynamic = "force-dynamic";

export default async function AdminChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const settings = await ensureChatWidgetSettings();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  const assigneeId = typeof params.assigneeId === "string" ? params.assigneeId : undefined;
  const slaState = typeof params.slaState === "string" ? params.slaState : undefined;

  const conversations = await prisma.chatConversation.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ticket: {
        source: "IN_APP",
        ...(assigneeId ? { assigneeId } : {}),
      },
    },
    include: {
      ticket: {
        select: {
          id: true,
          ticketNumber: true,
          customerName: true,
          customerEmail: true,
          subject: true,
          comments: {
            select: {
              authorType: true,
              createdAt: true,
            },
          },
          assignee: {
            select: { name: true },
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
  const enrichedConversations = metricConversations
    .map((conversation) => ({
    ...conversation,
    ticket: conversation.ticket,
    slaState: getChatSlaState(conversation, settings, new Date()),
    }))
    .filter((conversation) => !slaState || conversation.slaState === slaState);

  const agents = await prisma.agent.findMany({
    where: {
      isActive: true,
      role: { in: ["ADMIN", "AGENT", "TEAM_LEAD"] },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">실시간 채팅</h1>
        <p className="mt-1 text-sm text-muted-foreground">실시간 채팅 세션을 티켓처럼 배정하고 관리합니다.</p>
      </div>
      <div className="mb-4 flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/chats/analytics">채팅 분석 보기</Link>
        </Button>
      </div>
      <ChatSavedViewsBar
        currentFilter={{ status, assigneeId, slaState }}
        agents={agents}
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">대기 중</div>
          <div className="mt-1 text-3xl font-bold">{summary.waitingAgent}</div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">응답 대기</div>
          <div className="mt-1 text-3xl font-bold">{summary.waitingCustomer}</div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">활성 대화</div>
          <div className="mt-1 text-3xl font-bold">{summary.active}</div>
        </div>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">SLA 임박</div>
          <div className="mt-1 text-3xl font-bold">{summary.slaWarning}</div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">SLA 초과</div>
          <div className="mt-1 text-3xl font-bold">{summary.slaBreached}</div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">평균 첫 응답</div>
          <div className="mt-1 text-3xl font-bold">
            {summary.avgFirstResponseMinutes != null ? `${Math.round(summary.avgFirstResponseMinutes)}분` : "-"}
          </div>
        </div>
      </div>
      <ChatQueue conversations={enrichedConversations} />
    </div>
  );
}
