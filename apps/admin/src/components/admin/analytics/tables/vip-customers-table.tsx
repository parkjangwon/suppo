"use client";

import { useEffect, useState } from "react";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@crinity/ui/components/ui/table";
import { Badge } from "@crinity/ui/components/ui/badge";
import { DatePreset, VIPCustomer, VIPCustomerResponse } from "@/lib/db/queries/admin-analytics/contracts";
import { copyText } from "@/lib/i18n/admin-copy-utils";

interface VIPCustomersTableProps {
  preset: DatePreset;
}

export function VIPCustomersTable({ preset }: VIPCustomersTableProps) {
  const copy = useAdminCopy();
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy, key, copy.locale === "en" ? (en ?? ko) : ko);
  const [data, setData] = useState<VIPCustomerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/analytics/customers?preset=${preset}&segment=vip`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch VIP customers:", error);
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
          <div className="text-center text-muted-foreground">{copy.commonLoading}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("analyticsVipCustomers", "VIP 고객", "VIP customers")} ({data?.customers.length ?? 0}{copy.locale === "en" ? "" : "명"})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("navCustomers", "고객", "Customers")}</TableHead>
              <TableHead className="text-right">{t("analyticsRecent90Days", "최근 90일", "Last 90 days")}</TableHead>
              <TableHead className="text-right">{t("analyticsCumulative", "누적", "Lifetime")}</TableHead>
              <TableHead>{t("analyticsClassification", "분류", "Classification")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.customers.slice(0, 10).map((customer: VIPCustomer) => (
              <TableRow key={customer.customerEmail}>
                <TableCell>
                  <div className="font-medium">{customer.customerName}</div>
                  <div className="text-sm text-muted-foreground">{customer.customerEmail}</div>
                </TableCell>
                <TableCell className="text-right">{customer.recentTickets}</TableCell>
                <TableCell className="text-right">{customer.lifetimeTickets}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {customer.vipReasons.map((reason) => (
                      <VIPReasonBadge key={reason} reason={reason} />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {data?.customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {t("analyticsVipCustomersEmpty", "VIP 고객이 없습니다", "There are no VIP customers.")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function VIPReasonBadge({ reason }: { reason: string }) {
  const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    "high-volume": { label: "높은 이용", variant: "default" },
    "high-priority": { label: "고위험", variant: "destructive" },
    "long-term": { label: "장기 고객", variant: "secondary" },
  };

  const config = variants[reason] ?? { label: reason, variant: "outline" };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
