"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@crinity/ui/components/ui/badge";
import { Button } from "@crinity/ui/components/ui/button";
import { TicketFilters } from "./ticket-filters";
import { SavedFilters } from "./saved-filters";

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

const statusLabels: Record<string, string> = {
  OPEN: "접수",
  IN_PROGRESS: "처리중",
  WAITING: "대기",
  RESOLVED: "해결",
  CLOSED: "종료",
};

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  WAITING: "bg-orange-100 text-orange-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const priorityLabels: Record<string, string> = {
  URGENT: "긴급",
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
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
}: {
  tickets: Ticket[];
  categories: { id: string; name: string }[];
  agents: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(tickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTickets = tickets.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <TicketFilters
          categories={categories}
          agents={agents}
        />
        <SavedFilters
          currentFilter={{}}
          onApplyFilter={(filter) => {
            const params = new URLSearchParams();
            if (filter.status) params.set("status", filter.status);
            if (filter.priority) params.set("priority", filter.priority);
            if (filter.categoryId) params.set("categoryId", filter.categoryId);
            if (filter.assigneeId) params.set("assigneeId", filter.assigneeId);
            if (filter.search) params.set("search", filter.search);
            router.push(`/admin/tickets?${params.toString()}`);
          }}
        />
      </div>

      <div className="rounded-md border">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                티켓 번호
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                제목
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                고객
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                상태
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                우선순위
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                문의 유형
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                담당자
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                접수일
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
                    <span className="text-gray-400">미할당</span>
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
          티켓이 없습니다
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
              이전
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
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
