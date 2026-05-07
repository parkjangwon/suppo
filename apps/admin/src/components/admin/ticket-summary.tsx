"use client";

import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { FileText } from "lucide-react";

interface TicketSummaryProps {
  summary: string;
}

export function TicketSummary({ summary }: TicketSummaryProps) {
  const copy = useAdminCopy() as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          {t("ticketSummaryTitle", "티켓 요약 (AI)")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm">{summary}</p>
      </CardContent>
    </Card>
  );
}
