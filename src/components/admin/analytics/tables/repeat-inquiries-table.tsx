"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DatePreset, RepeatInquiry, RepeatInquiryResponse } from "@/lib/db/queries/admin-analytics/contracts";

interface RepeatInquiriesTableProps {
  preset: DatePreset;
}

export function RepeatInquiriesTable({ preset }: RepeatInquiriesTableProps) {
  const [data, setData] = useState<RepeatInquiryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/analytics/customers?preset=${preset}&segment=repeat`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch repeat inquiries:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [preset]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">불러오는 중...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>반복 문의 고객 ({data?.totalRepeatCustomers ?? 0}명)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>고객</TableHead>
              <TableHead className="text-right">티켓 수</TableHead>
              <TableHead className="text-right">카테고리</TableHead>
              <TableHead>패턴</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.customers.slice(0, 10).map((customer: RepeatInquiry) => (
              <TableRow key={customer.customerEmail}>
                <TableCell>
                  <div className="font-medium">{customer.customerName}</div>
                  <div className="text-sm text-muted-foreground">{customer.customerEmail}</div>
                </TableCell>
                <TableCell className="text-right">{customer.ticketCount}</TableCell>
                <TableCell className="text-right">{customer.distinctCategories}</TableCell>
                <TableCell>
                  <PatternBadge pattern={customer.patternType} />
                </TableCell>
              </TableRow>
            ))}
            {data?.customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  반복 문의 고객이 없습니다
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PatternBadge({ pattern }: { pattern: string }) {
  const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    "same-category": { label: "동일 카테고리", variant: "default" },
    "cross-category": { label: "다양한 카테고리", variant: "secondary" },
    "mixed": { label: "혼합", variant: "outline" },
  };

  const config = variants[pattern] ?? { label: pattern, variant: "outline" };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
