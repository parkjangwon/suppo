"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  status: string;
  priority: string;
  category: { name: string };
  assignee: { name: string } | null;
  createdAt: string;
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
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    priority: "",
    assignee: "",
    search: "",
  });

  const filteredTickets = tickets.filter((ticket) => {
    if (filters.status && ticket.status !== filters.status) return false;
    if (filters.category && ticket.category.name !== filters.category) return false;
    if (filters.priority && ticket.priority !== filters.priority) return false;
    if (filters.assignee && ticket.assignee?.name !== filters.assignee) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const match =
        ticket.ticketNumber.toLowerCase().includes(search) ||
        ticket.subject.toLowerCase().includes(search) ||
        ticket.customerEmail.toLowerCase().includes(search);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters((f) => ({ ...f, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.category}
              onValueChange={(value) =>
                setFilters((f) => ({ ...f, category: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.priority}
              onValueChange={(value) =>
                setFilters((f) => ({ ...f, priority: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="우선순위" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.assignee}
              onValueChange={(value) =>
                setFilters((f) => ({ ...f, assignee: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="담당자" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                <SelectItem value="미할당">미할당</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.name}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="티켓번호, 제목, 이메일 검색"
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

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
                카테고리
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
            {filteredTickets.map((ticket) => (
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
                <td className="px-4 py-3 text-sm">{ticket.category.name}</td>
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

      {filteredTickets.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          티켓이 없습니다
        </div>
      )}
    </div>
  );
}
