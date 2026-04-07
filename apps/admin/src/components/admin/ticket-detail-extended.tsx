"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPhoneNumber } from "@crinity/shared/utils/phone-format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crinity/ui/components/ui/select";
import { Badge } from "@crinity/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@crinity/ui/components/ui/tabs";
import { CommentSection } from "./comment-section";
import { TemplateContext } from "@/lib/templates/renderer";
import { TicketKnowledgeLinks } from "./ticket-knowledge-links";
import { GitIntegrationSection } from "@/components/ticket/git-integration-section";
import { LinkedIssuesReadonly } from "@/components/ticket/linked-issues-readonly";
import { TicketSummary } from "./ticket-summary";
import { CSATTab } from "@/components/admin/csat-tab";
import { TicketViewingIndicator } from "./ticket-viewing-indicator";
import { useTicketPresence } from "@/hooks/use-ticket-presence";
import { CustomerSnapshotCard } from "./customer-snapshot-card";
import { TicketRelationsPanel } from "./ticket-relations-panel";
import { TicketWorkspaceSummary } from "./ticket-workspace-summary";
import { toast } from "sonner";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";

interface TicketDetailProps {
  ticket: any;
  agents: { id: string; name: string }[];
  currentAgentId: string;
  isAdmin: boolean;
}

export function TicketDetailExtended({ ticket, agents, currentAgentId, isAdmin }: TicketDetailProps) {
  const copy = useAdminCopy() as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const { viewers } = useTicketPresence({ ticketId: ticket.id });

  const canEdit = isAdmin || ticket.assigneeId === currentAgentId;
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    OPEN: { label: t("ticketStatusOpen", "열림"), variant: "default" },
    IN_PROGRESS: { label: t("ticketStatusInProgress", "진행중"), variant: "secondary" },
    WAITING: { label: t("ticketStatusWaiting", "대기중"), variant: "outline" },
    RESOLVED: { label: t("ticketStatusResolved", "해결됨"), variant: "outline" },
    CLOSED: { label: t("ticketStatusClosed", "닫힘"), variant: "outline" },
  };
  const priorityMap: Record<string, { label: string; color: string }> = {
    URGENT: { label: t("ticketsPriorityUrgent", "긴급"), color: "text-red-500" },
    HIGH: { label: t("ticketsPriorityHigh", "높음"), color: "text-orange-500" },
    MEDIUM: { label: t("ticketsPriorityMedium", "보통"), color: "text-yellow-500" },
    LOW: { label: t("ticketsPriorityLow", "낮음"), color: "text-green-500" },
  };

  const assignee = agents.find((a) => a.id === ticket.assigneeId);
  const templateContext: TemplateContext = {
    ticket: {
      ticketNumber: ticket.ticketNumber ?? "",
      subject: ticket.subject ?? "",
      status: ticket.status ?? "",
      priority: ticket.priority ?? "",
    },
    customer: {
      name: ticket.customerName ?? "",
      email: ticket.customerEmail ?? "",
    },
    category: { name: ticket.category?.name ?? ticket.requestType?.name ?? "" },
    agent: { name: assignee?.name ?? "" },
  };

  const handleUpdate = async (field: string, value: string | null) => {
    if (!canEdit && field !== "assigneeId") {
      toast.error(t("ticketDetailUnauthorized", "권한이 없습니다."));
      return;
    }

    setIsUpdating(true);
    try {
      const body: Record<string, any> = {};
      body[field] = value;

      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(t("ticketDetailUpdateFailed", "업데이트 실패"));
      }

      toast.success(t("ticketDetailUpdateSuccess", "업데이트 되었습니다."));
      router.refresh();
    } catch (error) {
      toast.error(t("ticketDetailUpdateFailed", "업데이트 중 오류가 발생했습니다."));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAiSuggestion = async (): Promise<string | null> => {
    setIsGeneratingSuggestion(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/suggest-response`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();

      if (data.referencedArticles && data.referencedArticles.length > 0) {
        const titles = data.referencedArticles
          .map((a: { id: string; title: string }) => a.title)
          .join(", ");
        toast.info(`${t("knowledgeLinked", "참고 문서")}: ${titles}`, { duration: 5000 });
      }

      return data.suggestion;
    } catch (error) {
      toast.error(t("commentAiSuggestLoading", "AI 답변 생성 중 오류가 발생했습니다."));
      return null;
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{ticket.subject}</h1>
            <Badge variant="outline">{ticket.ticketNumber}</Badge>
          </div>
            <p className="text-sm text-muted-foreground">
            {t("commonCreate", "생성일")}: {format(new Date(ticket.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
          </p>
          <TicketViewingIndicator viewers={viewers} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            disabled={isUpdating || !canEdit}
            value={ticket.status}
            onValueChange={(value) => handleUpdate("status", value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("ticketDetailCurrentStatus", "상태")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">{statusMap.OPEN.label}</SelectItem>
              <SelectItem value="IN_PROGRESS">{statusMap.IN_PROGRESS.label}</SelectItem>
              <SelectItem value="WAITING">{statusMap.WAITING.label}</SelectItem>
              <SelectItem value="RESOLVED">{statusMap.RESOLVED.label}</SelectItem>
              <SelectItem value="CLOSED">{statusMap.CLOSED.label}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            disabled={isUpdating || !canEdit}
            value={ticket.priority}
            onValueChange={(value) => handleUpdate("priority", value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("ticketDetailPriority", "우선순위")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="URGENT">{priorityMap.URGENT.label}</SelectItem>
              <SelectItem value="HIGH">{priorityMap.HIGH.label}</SelectItem>
              <SelectItem value="MEDIUM">{priorityMap.MEDIUM.label}</SelectItem>
              <SelectItem value="LOW">{priorityMap.LOW.label}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            disabled={isUpdating || (!isAdmin && ticket.assigneeId !== currentAgentId && ticket.assigneeId !== null)}
            value={ticket.assigneeId || "unassigned"}
            onValueChange={(value) => handleUpdate("assigneeId", value === "unassigned" ? null : value)}
          >
            <SelectTrigger className="w-[160px]">
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

      <TicketWorkspaceSummary
        statusLabel={statusMap[ticket.status]?.label || ticket.status || "-"}
        priorityLabel={priorityMap[ticket.priority]?.label || ticket.priority || "-"}
        assigneeName={assignee?.name || "미할당"}
        requestTypeName={ticket.requestType?.name || "-"}
        canEdit={canEdit}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* AI 요약 */}
          {ticket.summary && (
            <TicketSummary summary={ticket.summary} />
          )}

          <Tabs defaultValue="thread">
            <TabsList>
            <TabsTrigger value="thread">{t("ticketDetailComments", "대화 내역")}</TabsTrigger>
            <TabsTrigger value="activity">{t("auditLogsTitle", "활동 로그")}</TabsTrigger>
            <TabsTrigger value="csat">{t("analyticsAverageRating", "만족도")}</TabsTrigger>
            </TabsList>

            <TabsContent value="thread" className="space-y-6 mt-4">
              <Card>
                <CardHeader className="bg-muted/50">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-medium">
                      {ticket.customerName} ({ticket.customerEmail})
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(ticket.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="whitespace-pre-wrap">{ticket.description}</div>
                  {ticket.attachments && ticket.attachments.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">{t("commonView", "첨부파일")}</h4>
                      <ul className="space-y-1">
                        {ticket.attachments.map((file: any) => (
                          <li key={file.id}>
                            <a href={file.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                              {file.fileName}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <CommentSection
                ticketId={ticket.id}
                comments={ticket.comments}
                canEdit={canEdit}
                requestTypeId={ticket.requestTypeId}
                onAiSuggestion={handleAiSuggestion}
                isGeneratingSuggestion={isGeneratingSuggestion}
                currentAgentId={currentAgentId}
                isAdmin={isAdmin}
                ticketAssigneeId={ticket.assigneeId}
                templateContext={templateContext}
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {ticket.activities?.map((activity: any) => (
                      <div key={activity.id} className="flex gap-4 text-sm">
                        <div className="text-muted-foreground whitespace-nowrap">
                          {format(new Date(activity.createdAt), "MM.dd HH:mm")}
                        </div>
                        <div>
                          <span className="font-medium">{activity.actor?.name || t("commonSystem", "시스템")}</span>
                          <span className="text-muted-foreground mx-1">{t("commonView", "님이")}</span>
                          {activity.action === "STATUS_CHANGED" && (
                            <span>{t("ticketDetailCurrentStatus", "상태를")} <Badge variant="outline">{statusMap[activity.oldValue]?.label || activity.oldValue}</Badge>에서 <Badge variant="outline">{statusMap[activity.newValue]?.label || activity.newValue}</Badge>로 변경했습니다.</span>
                          )}
                          {activity.action === "PRIORITY_CHANGED" && (
                            <span>{t("ticketDetailPriority", "우선순위를")} <span className="font-medium">{priorityMap[activity.oldValue]?.label || activity.oldValue}</span>에서 <span className="font-medium">{priorityMap[activity.newValue]?.label || activity.newValue}</span>로 변경했습니다.</span>
                          )}
                          {activity.action === "ASSIGNED" && (
                            <span>{t("ticketDetailAssigneeChange", "담당자를 할당했습니다.")}</span>
                          )}
                          {activity.action === "TRANSFERRED" && (
                            <span>{t("ticketTransferLabel", "티켓을 양도했습니다.")}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!ticket.activities || ticket.activities.length === 0) && (
                      <p className="text-muted-foreground text-center py-4">{t("commonNotFound", "활동 로그가 없습니다.")}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="csat" className="mt-4">
              <CSATTab ticketId={ticket.id} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("customersTitle", "고객 정보")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("customersName", "이름")}</div>
                <div>{ticket.customerName}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("customersEmail", "이메일")}</div>
                <div>
                  {ticket.customerId ? (
                    <Link href={`/admin/customers/${ticket.customerId}`} className="text-blue-600 hover:underline">
                      {ticket.customerEmail}
                    </Link>
                  ) : (
                    <a href={`mailto:${ticket.customerEmail}`} className="text-blue-600 hover:underline">
                      {ticket.customerEmail}
                    </a>
                  )}
                </div>
              </div>
              {ticket.customerPhone && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">{t("customersPhone", "전화번호")}</div>
                  <div>{formatPhoneNumber(ticket.customerPhone)}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {ticket.customerId ? (
            <CustomerSnapshotCard customerId={ticket.customerId} />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("ticketsTitle", "티켓 정보")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("ticketsFilterRequestType", "문의 유형")}</div>
                <div>{ticket.requestType?.name || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("commonCreate", "생성일")}</div>
                <div>{format(new Date(ticket.createdAt), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}</div>
              </div>
              {ticket.resolvedAt && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">{t("ticketStatusResolved", "해결일")}</div>
                  <div>{format(new Date(ticket.resolvedAt), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}</div>
                </div>
              )}
              {ticket.closedAt && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">{t("ticketStatusClosed", "종료일")}</div>
                  <div>{format(new Date(ticket.closedAt), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <TicketRelationsPanel ticketId={ticket.id} />

      <TicketKnowledgeLinks ticketId={ticket.id} canEdit={canEdit} />

      {isAdmin ? (
        <GitIntegrationSection
          ticketId={ticket.id}
          ticketNumber={ticket.ticketNumber}
          ticketSubject={ticket.subject}
          ticketDescription={ticket.description}
          initialLinks={ticket.gitLinks || []}
        />
      ) : canEdit ? (
        <LinkedIssuesReadonly
          ticketId={ticket.id}
          initialLinks={ticket.gitLinks || []}
        />
      ) : null}
    </div>
  );
}
