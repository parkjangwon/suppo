import { Alert, AlertDescription, AlertTitle } from "@suppo/ui/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";

interface TicketWorkspaceSummaryProps {
  statusLabel: string;
  priorityLabel: string;
  assigneeName: string;
  requestTypeName: string;
  canEdit: boolean;
}

export function TicketWorkspaceSummary({
  statusLabel,
  priorityLabel,
  assigneeName,
  requestTypeName,
  canEdit,
}: TicketWorkspaceSummaryProps) {
  const copy = useAdminCopy() as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t("ticketWorkspaceSummaryTitle", "처리 요약")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryItem label={t("ticketDetailCurrentStatus", "현재 상태")} value={statusLabel} />
          <SummaryItem label={t("ticketDetailPriority", "우선순위")} value={priorityLabel} />
          <SummaryItem label={t("ticketDetailAssignee", "담당자")} value={assigneeName} />
          <SummaryItem label={t("ticketsFilterRequestType", "문의 유형")} value={requestTypeName} />
        </div>

        <Alert
          className={
            canEdit
              ? "border-primary/20 bg-primary/5"
              : "border-amber-500/30 bg-amber-500/5"
          }
        >
          <AlertTitle>{canEdit ? t("ticketDetailCanEdit", "바로 처리 가능") : t("ticketDetailReadOnly", "읽기 전용 모드")}</AlertTitle>
          <AlertDescription>
            {canEdit
              ? t("ticketDetailCanEditDesc", "응답 작성과 내부 메모 등록을 바로 진행할 수 있습니다.")
              : t("ticketDetailReadOnlyDesc", "담당자이거나 관리자일 때 응답과 내부 메모를 남길 수 있습니다.")}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
