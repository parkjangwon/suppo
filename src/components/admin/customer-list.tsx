"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Users, Inbox, Calendar, ChevronRight, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface CustomerItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  ticketCount: number;
  lastTicketAt: string | null;
  createdAt: string;
}

interface CustomerListProps {
  initialCustomers: CustomerItem[];
}

export function CustomerList({ initialCustomers }: CustomerListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return initialCustomers;
    const query = searchQuery.toLowerCase();
    return initialCustomers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query)
    );
  }, [initialCustomers, searchQuery]);

  const stats = useMemo(() => {
    const total = initialCustomers.length;
    const totalTickets = initialCustomers.reduce((sum, c) => sum + c.ticketCount, 0);
    const activeThisMonth = initialCustomers.filter((c) => {
      if (!c.lastTicketAt) return false;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return new Date(c.lastTicketAt) > thirtyDaysAgo;
    }).length;

    return { total, totalTickets, activeThisMonth };
  }, [initialCustomers]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">전체 고객</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500 dark:text-blue-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">최근 활동 (30일)</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.activeThisMonth}</p>
              </div>
              <Calendar className="w-8 h-8 text-emerald-500 dark:text-emerald-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 dark:text-amber-400">총 누적 티켓</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.totalTickets}</p>
              </div>
              <Inbox className="w-8 h-8 text-amber-500 dark:text-amber-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="이름 또는 이메일로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>고객명</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>연락처</TableHead>
                <TableHead className="text-right">티켓 수</TableHead>
                <TableHead>최근 문의일</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    검색 결과가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone || "-"}</TableCell>
                    <TableCell className="text-right">{customer.ticketCount}</TableCell>
                    <TableCell>
                      {customer.lastTicketAt ? (
                        <span title={new Date(customer.lastTicketAt).toLocaleString()}>
                          {formatDistanceToNow(new Date(customer.lastTicketAt), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/customers/${customer.id}`}>
                          <ChevronRight className="w-4 h-4" />
                          <span className="sr-only">상세 보기</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden divide-y">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              검색 결과가 없습니다.
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <Link
                key={customer.id}
                href={`/admin/customers/${customer.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-medium leading-none">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                    <span>티켓 {customer.ticketCount}개</span>
                    <span>•</span>
                    <span>
                      {customer.lastTicketAt
                        ? formatDistanceToNow(new Date(customer.lastTicketAt), {
                            addSuffix: true,
                            locale: ko,
                          })
                        : "문의 내역 없음"}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
