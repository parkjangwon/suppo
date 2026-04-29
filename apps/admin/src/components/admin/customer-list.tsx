"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@suppo/ui/components/ui/input";
import { Button } from "@suppo/ui/components/ui/button";
import {
  Card,
  CardContent,
} from "@suppo/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@suppo/ui/components/ui/table";
import { Search, Users, Inbox, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { PaginationNav } from "@/components/ui/pagination-nav";

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
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  search?: string;
}

export function CustomerList({
  initialCustomers,
  page,
  totalPages,
  totalCount,
  pageSize,
  search,
}: CustomerListProps) {
  const copy = useAdminCopy() as unknown as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search ?? "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput.trim()) {
      params.set("search", searchInput.trim());
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">{t("customersTitle", "전체 고객")}</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalCount.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500 dark:text-blue-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 dark:text-amber-400">{t("customersTotalTickets", "이 페이지 고객")}</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{initialCustomers.length}</p>
              </div>
              <Inbox className="w-8 h-8 text-amber-500 dark:text-amber-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("customersSearchPlaceholder", "이름 또는 이메일로 검색...")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          {t("commonSearch", "검색")}
        </Button>
      </form>

      <Card>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("customersName", "이름")}</TableHead>
                <TableHead>{t("customersEmail", "이메일")}</TableHead>
                <TableHead>{t("customersPhone", "전화번호")}</TableHead>
                <TableHead className="text-right">{t("customersTotalTickets", "총 문의")}</TableHead>
                <TableHead>{t("customersRecentInquiry", "최근 문의")}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {t("commonNotFound", "찾을 수 없습니다")}
                  </TableCell>
                </TableRow>
              ) : (
                initialCustomers.map((customer) => (
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
                          <span className="sr-only">{t("commonView", "보기")}</span>
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
          {initialCustomers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t("commonNotFound", "찾을 수 없습니다")}
            </div>
          ) : (
            initialCustomers.map((customer) => (
              <Link
                key={customer.id}
                href={`/admin/customers/${customer.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-medium leading-none">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                    <span>{t("customersTotalTickets", "총 문의")} {customer.ticketCount}개</span>
                    <span>•</span>
                    <span>
                      {customer.lastTicketAt
                        ? formatDistanceToNow(new Date(customer.lastTicketAt), {
                            addSuffix: true,
                            locale: ko,
                          })
                        : t("customersNoHistory", "문의 내역 없음")}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            ))
          )}
        </div>
      </Card>

      <PaginationNav
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
