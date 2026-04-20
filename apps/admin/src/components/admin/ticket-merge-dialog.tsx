"use client";

import { useState } from "react";
import { Button } from "@suppo/ui/components/ui/button";
import { Label } from "@suppo/ui/components/ui/label";
import { Textarea } from "@suppo/ui/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@suppo/ui/components/ui/dialog";
import { Badge } from "@suppo/ui/components/ui/badge";
import { Checkbox } from "@suppo/ui/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  assignee: { name: string } | null;
}

interface TicketMergeDialogProps {
  targetTicket: Ticket;
  availableTickets: Ticket[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMergeComplete: () => void;
}

export function TicketMergeDialog({
  targetTicket,
  availableTickets,
  open,
  onOpenChange,
  onMergeComplete,
}: TicketMergeDialogProps) {
  const copy = useAdminCopy() as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [mergeComment, setMergeComment] = useState("");
  const [isMerging, setIsMerging] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    conflicts?: Array<{ field: string; sourceValue: any; targetValue: any }>;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const filteredTickets = availableTickets.filter(
    (t) => t.id !== targetTicket.id && t.status !== "CLOSED"
  );

  async function validateMerge() {
    if (selectedTicketIds.length === 0) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch(`/api/admin/tickets/validate-merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetTicketId: targetTicket.id,
          sourceTicketIds: selectedTicketIds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setValidationResult(data);
      }
    } catch (error) {
      console.error("Validation error:", error);
    } finally {
      setIsValidating(false);
    }
  }

  async function handleMerge() {
    if (selectedTicketIds.length === 0) {
      toast.error(t("ticketMergeSelectRequired", "병합할 티켓을 선택해주세요."));
      return;
    }

    if (!validationResult?.valid) {
      toast.error(t("ticketMergeConflict", "병합에 문제가 있습니다. 충돌을 확인해주세요."));
      return;
    }

    setIsMerging(true);
    try {
      const response = await fetch(`/api/admin/tickets/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetTicketId: targetTicket.id,
          sourceTicketIds: selectedTicketIds,
          mergeComment,
        }),
      });

      if (!response.ok) throw new Error();

      toast.success(t("ticketMergeSuccess", "티켓이 병합되었습니다."));
      onMergeComplete();
      onOpenChange(false);
      setSelectedTicketIds([]);
      setMergeComment("");
      setValidationResult(null);
    } catch {
      toast.error(t("ticketMergeFailed", "병합 중 오류가 발생했습니다."));
    } finally {
      setIsMerging(false);
    }
  }

  function handleToggleTicket(ticketId: string) {
    setSelectedTicketIds((prev) => {
      const newIds = prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId];

      // 선택 변경 시 검증 리셋
      setValidationResult(null);
      return newIds;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("ticketMergeValidate", "티켓 병합")}</DialogTitle>
          <DialogDescription>
            {t("ticketMergeReasonPlaceholder", "여러 티켓을 하나로 병합합니다. 선택한 티켓의 코멘트와 첨부파일이 대상 티켓으로 이동됩니다.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 대상 티켓 정보 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900">
                  {t("ticketMergeTargetTicket", "대상 티켓")}
                </div>
                <div className="text-lg font-semibold text-blue-900">
                  {targetTicket.ticketNumber}
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  {targetTicket.subject}
                </div>
              </div>
            </div>
          </div>

          {/* 병합할 티켓 선택 */}
          <div>
            <Label>{t("ticketMergeSelectRequired", "병합할 티켓 선택")}</Label>
            <div className="mt-2 border rounded-lg divide-y max-h-60 overflow-y-auto">
              {filteredTickets.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">
                  {t("commonNotFound", "병합할 수 있는 티켓이 없습니다.")}
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3 flex items-start gap-3 hover:bg-gray-50"
                  >
                    <Checkbox
                      id={ticket.id}
                      checked={selectedTicketIds.includes(ticket.id)}
                      onCheckedChange={() => handleToggleTicket(ticket.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={ticket.id}
                          className="font-medium cursor-pointer"
                        >
                          {ticket.ticketNumber}
                        </Label>
                        <Badge variant="outline">{ticket.status}</Badge>
                        <Badge
                          variant="outline"
                          className={
                            ticket.priority === "URGENT"
                              ? "bg-red-100 text-red-800 border-red-200"
                              : ticket.priority === "HIGH"
                              ? "bg-orange-100 text-orange-800 border-orange-200"
                              : ticket.priority === "LOW"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-blue-100 text-blue-800 border-blue-200"
                          }
                        >
                          {ticket.priority}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-700 truncate">
                        {ticket.subject}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 충돌 경고 */}
          {validationResult && !validationResult.valid && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-amber-900">
                    병합 충돌이 감지되었습니다
                  </div>
                  <div className="mt-2 space-y-1">
                    {validationResult.conflicts?.map((conflict, i) => (
                      <div key={i} className="text-sm text-amber-800">
                        <span className="font-medium">
                          {conflict.field === "assignee"
                            ? t("ticketMergeFieldAssignee", "담당자")
                            : conflict.field === "team"
                            ? t("ticketMergeFieldTeam", "팀")
                            : conflict.field === "status"
                            ? t("ticketMergeFieldStatus", "상태")
                            : conflict.field}
                          :
                        </span>{" "}
                        <span className="line-through text-gray-500">
                          {conflict.sourceValue}
                        </span>{" "}
                        → {conflict.targetValue}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 병합 코멘트 */}
          <div>
            <Label htmlFor="merge-comment">{t("ticketMergeReasonPlaceholder", "병합 코멘트 (선택사항)")}</Label>
            <Textarea
              id="merge-comment"
              value={mergeComment}
              onChange={(e) => setMergeComment(e.target.value)}
              placeholder={t("ticketMergeReasonPlaceholder", "병합 이유를 입력해주세요...")}
              className="mt-2"
              rows={3}
            />
          </div>

          {/* 버튼 영역 */}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  setSelectedTicketIds([]);
                  setMergeComment("");
                  setValidationResult(null);
                }}
                disabled={isMerging}
                className="flex-1"
              >
                {t("commonCancel", "취소")}
              </Button>
              <Button
                variant="outline"
                onClick={validateMerge}
                disabled={selectedTicketIds.length === 0 || isValidating || isMerging}
                className="flex-1"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("ticketMergeValidate", "검증 중...")}
                  </>
                ) : (
                  t("ticketMergeValidate", "검증")
                )}
              </Button>
              <Button
                onClick={handleMerge}
                disabled={
                  selectedTicketIds.length === 0 ||
                  !validationResult?.valid ||
                  isMerging
                }
                className="flex-1"
              >
                {isMerging ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("commonProcessing", "병합 중...")}
                  </>
                ) : (
                  `${t("ticketMergeSuccess", "티켓")} ${selectedTicketIds.length}${t("commonCreate", "개 병합")}`
                )}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
