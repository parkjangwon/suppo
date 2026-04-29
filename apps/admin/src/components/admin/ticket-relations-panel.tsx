"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@suppo/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";

interface TicketRelationRecord {
  id: string;
  mergedAt: string;
  sourceTicket: {
    id: string;
    ticketNumber: string;
    subject: string;
    status: string;
  };
  targetTicket: {
    id: string;
    ticketNumber: string;
    subject: string;
    status: string;
  };
}

interface TicketRelationsPanelProps {
  ticketId: string;
}

export function TicketRelationsPanel({ ticketId }: TicketRelationsPanelProps) {
  const copy = useAdminCopy() as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const [relations, setRelations] = useState<TicketRelationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRelations() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/tickets/merge?ticketId=${ticketId}`);
        if (!response.ok) {
          throw new Error("Failed to load relations");
        }
        const data = await response.json();
        setRelations(data);
      } catch {
        setRelations([]);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchRelations();
  }, [ticketId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">티켓 관계</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("commonLoading", "병합 이력을 불러오는 중...")}</p>
        ) : relations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("commonNotFound", "병합/연결 이력이 없습니다.")}</p>
        ) : (
          relations.map((relation) => (
            <div key={relation.id} className="rounded-lg border border-border/60 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{t("ticketMergeSuccess", "병합 이력")}</Badge>
                <span>{new Date(relation.mergedAt).toLocaleString("ko-KR")}</span>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <RelationTicketCard title={t("ticketMergeFieldAssignee", "원본 티켓")} ticket={relation.sourceTicket} />
                <RelationTicketCard title={t("ticketMergeFieldTeam", "대상 티켓")} ticket={relation.targetTicket} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function RelationTicketCard({
  title,
  ticket,
}: {
  title: string;
  ticket: TicketRelationRecord["sourceTicket"];
}) {
  return (
    <div className="rounded-lg bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{title}</div>
      <Link href={`/admin/tickets/${ticket.id}`} className="mt-1 block font-medium text-primary hover:underline">
        {ticket.ticketNumber}
      </Link>
      <div className="mt-1 text-sm text-muted-foreground">{ticket.subject}</div>
    </div>
  );
}
