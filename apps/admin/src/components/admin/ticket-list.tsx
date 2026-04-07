"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@crinity/ui/components/ui/badge";
import { Button } from "@crinity/ui/components/ui/button";
import { Checkbox } from "@crinity/ui/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crinity/ui/components/ui/select";
import { TicketFilters } from "./ticket-filters";
import { AdvancedSearch } from "./advanced-search";
import { SavedFilters } from "./saved-filters";
import { TicketQueueBar } from "./ticket-queue-bar";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  status: string;
  priority: string;
  category: { name: string } | null;
  requestType: { name: string } | null;
  assignee: { name: string } | null;
  createdAt: Date | string;
}

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  WAITING: "bg-orange-100 text-orange-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const priorityColors: Record<string, string> = {
  URGENT: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  LOW: "bg-green-100 text-green-800",
};

export function TicketList({
  tickets,
  categories,
  agents,
  currentAgentId,
  currentFilter,
}: {
  tickets: Ticket[];
  categories: { id: string; name: string }[];
  agents: { id: string; name: string }[];
  currentAgentId?: string;
  currentFilter: {
    queue?: string;
    status?: string;
    priority?: string;
    categoryId?: string;
    assigneeId?: string;
    search?: string;
    customerSegment?: string;
    slaState?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}) {
  const copy = useAdminCopy() as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(tickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTickets = tickets.slice(startIndex, startIndex + itemsPerPage);
  const allVisibleSelected =
    paginatedTickets.length > 0 &&
    paginatedTickets.every((ticket) => selectedTicketIds.includes(ticket.id));
  const statusLabels: Record<string, string> = {
    OPEN: t("ticketStatusOpen", "접수"),
    IN_PROGRESS: t("ticketStatusInProgress", "처리중"),
    WAITING: t("ticketStatusWaiting", "대기"),
    RESOLVED: t("ticketStatusResolved", "해결"),
    CLOSED: t("ticketStatusClosed", "종료"),
  };
  const priorityLabels: Record<string, string> = {
    URGENT: t("ticketsPriorityUrgent", "긴급"),
    HIGH: t("ticketsPriorityHigh", "높음"),
    MEDIUM: t("ticketsPriorityMedium", "보통"),
    LOW: t("ticketsPriorityLow", "낮음"),
  };

  const handleAdvancedSearch = (params: URLSearchParams) => {
    params.delete("cursor");
    router.push(`/admin/tickets?${params.toString()}`);
  };

  const toggleTicketSelection = (ticketId: string, checked: boolean) => {
    setSelectedTicketIds((prev) =>
      checked ? [...new Set([...prev, ticketId])] : prev.filter((id) => id !== ticketId)
    );
  };

  const toggleVisibleTickets = (checked: boolean) => {
    const visibleIds = paginatedTickets.map((ticket) => ticket.id);

    setSelectedTicketIds((prev) => {
      if (checked) {
        return [...new Set([...prev, ...visibleIds])];
      }

      return prev.filter((id) => !visibleIds.includes(id));
    });
  };

  const applyBulkUpdate = async () => {
    const payload: {
      ticketIds: string[];
      status?: string;
      priority?: string;
      assigneeId?: string | null;
    } = {
      ticketIds: selectedTicketIds,
    };

    if (bulkStatus) payload.status = bulkStatus;
    if (bulkPriority) payload.priority = bulkPriority;
    if (bulkAssigneeId) payload.assigneeId = bulkAssigneeId === "unassigned" ? null : bulkAssigneeId;

    if (!payload.status && !payload.priority && payload.assigneeId === undefined) {
      toast.error(t("ticketsBulkSelectRequired", "일괄 변경할 항목을 선택해주세요."));
      return;
    }

    setIsApplyingBulk(true);
    try {
      const response = await fetch("/api/admin/tickets/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("bulk update failed");
      }

      toast.success(t("ticketsBulkSuccess", "일괄 변경이 완료되었습니다."));
      setSelectedTicketIds([]);
      setBulkStatus("");
      setBulkPriority("");
      setBulkAssigneeId("");
      router.refresh();
    } catch (error) {
      toast.error(t("ticketsBulkFailed", "일괄 변경에 실패했습니다."));
    } finally {
      setIsApplyingBulk(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant={!isAdvancedSearch ? "default" : "outline"}
              size="sm"
              onClick={() => setIsAdvancedSearch(false)}
            >
              <Search className="h-4 w-4 mr-2" />
              {t("ticketsSearch", "기본 검색")}
            </Button>
            <Button
              variant={isAdvancedSearch ? "default" : "outline"}
              size="sm"
              onClick={() => setIsAdvancedSearch(true)}
            >
              <Search className="h-4 w-4 mr-2" />
              {t("advancedSearchPlaceholder", "고급 검색")}
            </Button>
          </div>

          <TicketQueueBar currentAgentId={currentAgentId} />

          {isAdvancedSearch ? (
            <AdvancedSearch
              categories={categories}
              agents={agents}
              onSearch={handleAdvancedSearch}
            />
          ) : null}

          {/* Always show standard filters, but hide basic search when in advanced mode */}
          <TicketFilters
            categories={categories}
            agents={agents}
            showBasicSearch={!isAdvancedSearch}
          />
        </div>
        <SavedFilters
          currentFilter={currentFilter}
          onApplyFilter={(filter) => {
            const params = new URLSearchParams();
            if (filter.queue) params.set("queue", filter.queue);
            if (filter.status) params.set("status", filter.status);
            if (filter.priority) params.set("priority", filter.priority);
            if (filter.categoryId) params.set("categoryId", filter.categoryId);
            if (filter.assigneeId) params.set("assigneeId", filter.assigneeId);
            if (filter.search) params.set("search", filter.search);
            if (filter.customerSegment) params.set("customerSegment", filter.customerSegment);
            if (filter.slaState) params.set("slaState", filter.slaState);
            if (filter.dateFrom) params.set("dateFrom", filter.dateFrom);
            if (filter.dateTo) params.set("dateTo", filter.dateTo);
            router.push(`/admin/tickets?${params.toString()}`);
          }}
        />
      </div>

      {selectedTicketIds.length > 0 ? (
        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="mb-3 text-sm font-medium">
            {selectedTicketIds.length}
            {t("commonAll", "개 티켓 선택됨")}
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            <Select value={bulkStatus || "none"} onValueChange={(value) => setBulkStatus(value === "none" ? "" : value)}>
              <SelectTrigger aria-label={t("ticketsBulkStatus", "벌크 상태 변경")}>
                <SelectValue placeholder={t("ticketsBulkStatus", "상태 변경")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("commonNone", "상태 변경 안 함")}</SelectItem>
                <SelectItem value="OPEN">{statusLabels.OPEN}</SelectItem>
                <SelectItem value="IN_PROGRESS">{statusLabels.IN_PROGRESS}</SelectItem>
                <SelectItem value="WAITING">{statusLabels.WAITING}</SelectItem>
                <SelectItem value="RESOLVED">{statusLabels.RESOLVED}</SelectItem>
                <SelectItem value="CLOSED">{statusLabels.CLOSED}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={bulkPriority || "none"} onValueChange={(value) => setBulkPriority(value === "none" ? "" : value)}>
              <SelectTrigger aria-label={t("ticketsBulkPriority", "벌크 우선순위 변경")}>
                <SelectValue placeholder={t("ticketsBulkPriority", "우선순위 변경")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("commonNone", "우선순위 변경 안 함")}</SelectItem>
                <SelectItem value="URGENT">{priorityLabels.URGENT}</SelectItem>
                <SelectItem value="HIGH">{priorityLabels.HIGH}</SelectItem>
                <SelectItem value="MEDIUM">{priorityLabels.MEDIUM}</SelectItem>
                <SelectItem value="LOW">{priorityLabels.LOW}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={bulkAssigneeId || "none"} onValueChange={(value) => setBulkAssigneeId(value === "none" ? "" : value)}>
              <SelectTrigger aria-label={t("ticketsBulkAssignee", "벌크 담당자 변경")}>
                <SelectValue placeholder={t("ticketsBulkAssignee", "담당자 변경")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("commonNone", "담당자 변경 안 함")}</SelectItem>
                <SelectItem value="unassigned">{t("ticketDetailUnassigned", "미할당")}</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button onClick={applyBulkUpdate} disabled={isApplyingBulk}>
                {isApplyingBulk ? t("commonProcessing", "적용 중...") : t("ticketsBulkApply", "벌크 적용")}
              </Button>
              <Button variant="outline" onClick={() => setSelectedTicketIds([])} disabled={isApplyingBulk}>
                {t("commonClose", "선택 해제")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                <Checkbox
                  aria-label="전체 선택"
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => toggleVisibleTickets(Boolean(checked))}
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                {t("ticketsTitle", "티켓 번호")}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                {t("ticketDetailTitle", "제목")}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                {t("customersTitle", "고객")}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                {t("ticketDetailStatus", "상태")}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                {t("ticketDetailPriority", "우선순위")}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                {t("ticketsFilterRequestType", "문의 유형")}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                {t("ticketDetailAssignee", "담당자")}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                {t("businessHoursDate", "접수일")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedTickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
              >
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    aria-label={`select-ticket-${ticket.ticketNumber}`}
                    checked={selectedTicketIds.includes(ticket.id)}
                    onCheckedChange={(checked) => toggleTicketSelection(ticket.id, Boolean(checked))}
                  />
                </td>
                <td className="px-4 py-3 text-sm font-medium text-blue-600">
                  {ticket.ticketNumber}
                </td>
                <td className="px-4 py-3 text-sm">{ticket.subject}</td>
                <td className="px-4 py-3 text-sm">
                  {ticket.customerName}
                  <br />
                  <span className="text-xs text-gray-500">
                    {ticket.customerEmail}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge className={statusColors[ticket.status]}>
                    {statusLabels[ticket.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className={priorityColors[ticket.priority]}>
                    {priorityLabels[ticket.priority]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm">{ticket.requestType?.name || "-"}</td>
                <td className="px-4 py-3 text-sm">
                    {ticket.assignee?.name || (
                    <span className="text-gray-400">{t("ticketDetailUnassigned", "미할당")}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(ticket.createdAt).toLocaleDateString("ko-KR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tickets.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {t("commonNotFound", "티켓이 없습니다")}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            총 {tickets.length}개 중 {startIndex + 1}-{Math.min(startIndex + itemsPerPage, tickets.length)}개 표시
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              {t("commonCancel", "이전")}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              {t("commonCreate", "다음")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
