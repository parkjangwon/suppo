"use client";

import Link from "next/link";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";

import { Badge } from "@crinity/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";

import { ChatAutoRefresh } from "./chat-auto-refresh";
import { copyText } from "@/lib/i18n/admin-copy-utils";

export function ChatQueue({
  conversations,
}: {
  conversations: Array<{
    id: string;
    status: string;
    lastMessageAt: string | Date;
    slaState?: "healthy" | "warning" | "breached";
    ticket: {
      id: string;
      ticketNumber: string;
      customerName: string;
      customerEmail: string;
      subject: string;
      assignee: { name: string } | null;
    };
  }>;
}) {
  const copy = useAdminCopy();
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy, key, copy.locale === "en" ? (en ?? ko) : ko);
  return (
    <div className="space-y-4">
      <ChatAutoRefresh />
      {conversations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t("chatQueueEmpty", "진행 중인 채팅이 없습니다.", "There are no active chats.")}
          </CardContent>
        </Card>
      ) : (
        conversations.map((conversation) => (
          <Card key={conversation.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <Link href={`/admin/chats/${conversation.id}`} className="hover:underline">
                  {conversation.ticket.customerName} · {conversation.ticket.ticketNumber}
                </Link>
                <div className="flex items-center gap-2">
                  {conversation.slaState === "warning" ? <Badge>{t("chatsSlaWarning", "SLA 임박", "SLA warning")}</Badge> : null}
                  {conversation.slaState === "breached" ? <Badge variant="destructive">{t("chatsSlaBreached", "SLA 초과", "SLA breached")}</Badge> : null}
                  <Badge variant="outline">{conversation.status}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>{conversation.ticket.subject}</div>
              <div>{conversation.ticket.customerEmail}</div>
              <div>{t("ticketDetailAssignee", "담당자", "Assignee")}: {conversation.ticket.assignee?.name ?? t("ticketDetailUnassigned", "미할당", "Unassigned")}</div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
