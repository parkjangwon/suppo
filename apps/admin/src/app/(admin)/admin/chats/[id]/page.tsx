import { redirect, notFound } from "next/navigation";

import { prisma } from "@crinity/db";
import { getChatSlaState } from "@crinity/shared/chat/metrics";
import { ensureChatWidgetSettings } from "@crinity/shared/chat/widget-settings";

import { auth } from "@/auth";
import { ChatWorkspace } from "@/components/admin/chat-workspace";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function AdminChatDetailPage({ params }: RouteParams) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const conversation = await prisma.chatConversation.findUnique({
    where: { id },
    include: {
      ticket: {
        include: {
          assignee: {
            select: { id: true, name: true },
          },
          requestType: {
            select: { id: true, name: true },
          },
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              attachments: true,
            },
          },
        },
      },
    },
  });

  if (!conversation) {
    notFound();
  }

  const chatSettings = await ensureChatWidgetSettings();
  const slaState = getChatSlaState(conversation, chatSettings, new Date());

  const latestCustomerRead = await prisma.chatEvent.findFirst({
    where: {
      conversationId: id,
      type: "message.read",
    },
    orderBy: { createdAt: "desc" },
  });

  const agents = await prisma.agent.findMany({
    where: {
      isActive: true,
      role: { in: ["ADMIN", "AGENT", "TEAM_LEAD"] },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <ChatWorkspace
        conversation={conversation}
        agents={agents}
        currentAgentId={session.user.agentId}
        isAdmin={session.user.role === "ADMIN"}
        initialCustomerReadAt={latestCustomerRead?.createdAt.toISOString() ?? null}
        slaState={slaState}
      />
    </div>
  );
}
