"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Comment {
  id: string;
  authorType: string;
  authorName: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  attachments: { id: string; fileName: string; fileUrl: string }[];
}

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  assignee: { id: string; name: string } | null;
  category: { name: string };
  createdAt: string;
  comments: Comment[];
}

const statusLabels: Record<string, string> = {
  OPEN: "접수",
  IN_PROGRESS: "처리중",
  WAITING: "대기",
  RESOLVED: "해결",
  CLOSED: "종료",
};

const priorityLabels: Record<string, string> = {
  URGENT: "긴급",
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

export function TicketDetail({
  ticket,
  agents,
  isAdmin,
  currentAgentId,
}: {
  ticket: Ticket;
  agents: { id: string; name: string }[];
  isAdmin: boolean;
  currentAgentId: string;
}) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = isAdmin || ticket.assignee?.id === currentAgentId;

  async function updateTicket(updates: Partial<Ticket>) {
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) router.refresh();
  }

  async function submitReply() {
    if (!reply.trim()) return;
    setLoading(true);

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: ticket.id,
        content: reply,
        isInternal,
      }),
    });

    if (res.ok) {
      setReply("");
      setIsInternal(false);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{ticket.ticketNumber}</p>
              <CardTitle className="text-xl mt-1">{ticket.subject}</CardTitle>
            </div>
            <div className="flex gap-2">
              {canEdit ? (
                <>
                  <Select
                    value={ticket.status}
                    onValueChange={(value) => updateTicket({ status: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={ticket.priority}
                    onValueChange={(value) => updateTicket({ priority: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={ticket.assignee?.id || "unassigned"}
                    onValueChange={(value) =>
                      updateTicket({
                        assigneeId: value === "unassigned" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="담당자" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">미할당</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <>
                  <Badge variant="outline">{statusLabels[ticket.status]}</Badge>
                  <Badge variant="outline">
                    {priorityLabels[ticket.priority]}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">고객:</span>{" "}
              {ticket.customerName}
            </div>
            <div>
              <span className="text-gray-500">이메일:</span>{" "}
              {ticket.customerEmail}
            </div>
            {ticket.customerPhone && (
              <div>
                <span className="text-gray-500">전화:</span>{" "}
                {ticket.customerPhone}
              </div>
            )}
            <div>
              <span className="text-gray-500">카테고리:</span>{" "}
              {ticket.category.name}
            </div>
            <div>
              <span className="text-gray-500">접수일:</span>{" "}
              {new Date(ticket.createdAt).toLocaleString("ko-KR")}
            </div>
            <div>
              <span className="text-gray-500">담당자:</span>{" "}
              {ticket.assignee?.name || "미할당"}
            </div>
          </div>

          <hr className="my-4" />

          <div className="prose max-w-none">
            <h4 className="text-sm font-medium text-gray-500 mb-2">문의 내용</h4>
            <p className="whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>대화 내역</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-4 rounded-lg ${
                comment.isInternal
                  ? "bg-amber-50 border border-amber-200"
                  : comment.authorType === "AGENT"
                  ? "bg-blue-50"
                  : "bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{comment.authorName}</span>
                  <span className="text-xs text-gray-500">
                    {comment.authorType === "AGENT" ? "상담원" : "고객"}
                  </span>
                  {comment.isInternal && (
                    <Badge variant="secondary" className="text-xs">
                      낶부 메모
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(comment.createdAt).toLocaleString("ko-KR")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
              {comment.attachments.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {comment.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {att.fileName}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}

          {ticket.comments.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              아직 대화가 없습니다
            </p>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>응답 작성</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="응답을 입력하세요..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="internal"
                  checked={isInternal}
                  onCheckedChange={(checked) => setIsInternal(checked === true)}
                />
                <Label htmlFor="internal" className="text-sm cursor-pointer">
                  낶부 메모로 저장
                </Label>
              </div>
              <Button onClick={submitReply} disabled={loading || !reply.trim()}>
                {loading ? "전송중..." : "전송"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
