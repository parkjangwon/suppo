"use client";

import { useMemo, useState } from "react";

import { Button } from "@crinity/ui/components/ui/button";

interface TransferAgent {
  id: string;
  name: string;
  isActive: boolean;
}

interface TransferDialogProps {
  ticketId: string;
  currentAssigneeId: string | null;
  triggerLabel?: string;
  activeAgents: TransferAgent[];
  onTransferred?: () => void;
}

export function TransferDialog({
  ticketId,
  currentAssigneeId,
  triggerLabel = "양도",
  activeAgents,
  onTransferred
}: TransferDialogProps) {
  const [open, setOpen] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const candidates = useMemo(
    () => activeAgents.filter((agent) => agent.isActive && agent.id !== currentAssigneeId),
    [activeAgents, currentAssigneeId]
  );

  const handleSubmit = async () => {
    setError("");

    if (!targetAgentId) {
      setError("양도할 상담원을 선택해주세요");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tickets/${ticketId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAgentId: targetAgentId,
          reason: reason.trim() || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "양도 처리에 실패했습니다");
        return;
      }

      setOpen(false);
      setTargetAgentId("");
      setReason("");
      onTransferred?.();
    } catch {
      setError("양도 처리 중 오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-xl">
            <h3 className="text-lg font-semibold">티켓 양도</h3>
            <p className="mt-1 text-sm text-slate-400">담당 티켓을 다른 상담원에게 양도합니다.</p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">상담원 선택</span>
                <select
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={targetAgentId}
                  onChange={(event) => setTargetAgentId(event.target.value)}
                >
                  <option value="">상담원을 선택하세요</option>
                  {candidates.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">양도 사유 (선택)</span>
                <textarea
                  className="h-24 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="양도 사유를 입력하세요"
                />
              </label>

              {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
                취소
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "처리 중..." : "양도"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export type { TransferAgent, TransferDialogProps };
