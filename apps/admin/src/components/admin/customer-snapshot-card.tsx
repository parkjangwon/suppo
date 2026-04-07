"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Button } from "@crinity/ui/components/ui/button";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";

interface CustomerSnapshotCardProps {
  customerId: string;
}

interface CustomerSnapshotData {
  stats: {
    totalTickets: number;
    openTickets: number;
    avgCsat: number | null;
    lastTicketAt: string | null;
  };
}

export function CustomerSnapshotCard({ customerId }: CustomerSnapshotCardProps) {
  const copy = useAdminCopy() as unknown as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const [data, setData] = useState<CustomerSnapshotData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchCustomerSnapshot() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/customers/${customerId}/analytics`);
        if (!response.ok) {
          throw new Error("Failed to load customer snapshot");
        }

        const payload = await response.json();
        if (isMounted) {
          setData(payload);
        }
      } catch (error) {
        if (isMounted) {
          setData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchCustomerSnapshot();

    return () => {
      isMounted = false;
    };
  }, [customerId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("customersTitle", "고객 관리")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("commonLoading", "로딩 중...")}</p>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <SnapshotMetric label={t("customersTotalTickets", "총 문의")} value={`${data.stats.totalTickets}건`} />
              <SnapshotMetric label={t("ticketStatusOpen", "열림")} value={`${data.stats.openTickets}건`} />
              <SnapshotMetric
                label={t("customersCsat", "고객 만족도")}
                value={data.stats.avgCsat != null ? `${data.stats.avgCsat.toFixed(1)}점` : "-"}
              />
              <SnapshotMetric
                label={t("customersRecentInquiry", "최근 문의")}
                value={
                  data.stats.lastTicketAt
                    ? new Date(data.stats.lastTicketAt).toLocaleDateString("ko-KR")
                    : "-"
                }
              />
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link href={`/admin/customers/${customerId}`}>{t("commonView", "보기")}</Link>
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("commonNotFound", "찾을 수 없습니다")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SnapshotMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
