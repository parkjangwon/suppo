"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@crinity/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crinity/ui/components/ui/select";
import { toast } from "sonner";

import { CommentSection } from "./comment-section";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";

export function ChatWorkspace({
  conversation,
  agents,
  currentAgentId,
  isAdmin,
  initialCustomerReadAt,
  slaState,
}: {
  conversation: any;
  agents: Array<{ id: string; name: string }>;
  currentAgentId: string;
  isAdmin: boolean;
  initialCustomerReadAt?: string | null;
  slaState?: "healthy" | "warning" | "breached";
}) {
  const copy = useAdminCopy() as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [customerTyping, setCustomerTyping] = useState(false);
  const [customerReadAt, setCustomerReadAt] = useState<string | null>(initialCustomerReadAt ?? null);
  const ticket = conversation.ticket;

  async function handleUpdate(field: "status" | "assigneeId", value: string | null) {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [field]: value,
        }),
      });

      if (!response.ok) {
        throw new Error("failed to update");
      }

      router.refresh();
    } catch (error) {
      toast.error(t("chatViewSaveFailed", "채팅 상태 업데이트에 실패했습니다."));
    } finally {
      setIsUpdating(false);
    }
  }

  useEffect(() => {
    const eventSource = new EventSource(`/api/admin/chat/stream?conversationId=${conversation.id}`);

    eventSource.addEventListener("message", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as {
        type: string;
        payload?: { senderType?: string; isTyping?: boolean; commentId?: string };
        createdAt: string;
      };

      if (data.type === "typing.updated" && data.payload?.senderType === "CUSTOMER") {
        setCustomerTyping(Boolean(data.payload.isTyping));
        return;
      }

      if (data.type === "message.read" && data.payload?.senderType === "CUSTOMER") {
        setCustomerReadAt(data.createdAt);
        return;
      }

      if (data.type === "message.created") {
        router.refresh();
      }
    });

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 2000);

    return () => {
      eventSource.close();
      window.clearInterval(intervalId);
    };
  }, [conversation.id, router]);

  async function updateTypingState(isTyping: boolean) {
    await fetch(`/api/admin/chats/${conversation.id}/typing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isTyping }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{ticket.customerName}</h1>
            <Badge variant="outline">{ticket.ticketNumber}</Badge>
            <Badge>{conversation.status}</Badge>
            {slaState === "warning" ? <Badge>{t("slaPolicyRunning", "SLA 임박")}</Badge> : null}
            {slaState === "breached" ? <Badge variant="destructive">{t("slaPolicyStopped", "SLA 초과")}</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{ticket.customerEmail}</p>
        </div>
        <div className="flex gap-2">
          <Select
            disabled={isUpdating}
            value={ticket.status}
            onValueChange={(value) => handleUpdate("status", value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t("ticketDetailCurrentStatus", "상태")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">{t("ticketStatusOpen", "열림")}</SelectItem>
              <SelectItem value="IN_PROGRESS">{t("ticketStatusInProgress", "진행중")}</SelectItem>
              <SelectItem value="WAITING">{t("ticketStatusWaiting", "대기중")}</SelectItem>
              <SelectItem value="RESOLVED">{t("ticketStatusResolved", "해결됨")}</SelectItem>
              <SelectItem value="CLOSED">{t("ticketStatusClosed", "종료")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            disabled={isUpdating}
            value={ticket.assigneeId || "unassigned"}
            onValueChange={(value) => handleUpdate("assigneeId", value === "unassigned" ? null : value)}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder={t("ticketDetailAssignee", "담당자")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">{t("ticketDetailUnassigned", "미할당")}</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <CommentSection
          ticketId={ticket.id}
          comments={ticket.comments}
          canEdit
          requestTypeId={ticket.requestTypeId}
          currentAgentId={currentAgentId}
          isAdmin={isAdmin}
          ticketAssigneeId={ticket.assigneeId}
          onTypingChange={updateTypingState}
          templateContext={{
            ticket: {
              ticketNumber: ticket.ticketNumber,
              subject: ticket.subject,
              status: ticket.status,
              priority: ticket.priority,
            },
            customer: {
              name: ticket.customerName,
              email: ticket.customerEmail,
            },
            category: { name: ticket.requestType?.name ?? "" },
            agent: { name: ticket.assignee?.name ?? "" },
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>{t("navChats", "채팅 정보")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>{t("chatViewSaveSuccess", "대화 상태")}: {conversation.status}</div>
            {customerTyping ? <div className="text-emerald-700">{t("commonProcessing", "고객이 입력 중...")}</div> : null}
            {customerReadAt ? <div className="text-emerald-700">{t("commonConnected", "고객이 마지막 메시지를 읽음")}</div> : null}
            <div>{t("chatViewSaveSuccess", "최근 메시지")}: {new Date(conversation.lastMessageAt).toLocaleString("ko-KR")}</div>
            <div>{t("chatViewSaveSuccess", "고객 최근 메시지")}: {conversation.lastCustomerMessageAt ? new Date(conversation.lastCustomerMessageAt).toLocaleString("ko-KR") : t("commonNone", "없음")}</div>
            <div>{t("chatViewSaveSuccess", "상담원 최근 메시지")}: {conversation.lastAgentMessageAt ? new Date(conversation.lastAgentMessageAt).toLocaleString("ko-KR") : t("commonNone", "없음")}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
