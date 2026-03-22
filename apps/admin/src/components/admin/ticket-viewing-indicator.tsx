"use client";

import { Eye } from "lucide-react";

interface Viewer {
  agentId: string;
  agentName: string;
  lastSeenAt: string;
}

interface TicketViewingIndicatorProps {
  viewers: Viewer[];
}

export function TicketViewingIndicator({ viewers }: TicketViewingIndicatorProps) {
  if (viewers.length === 0) return null;

  const viewerNames = viewers.map((v) => v.agentName).join(", ");

  return (
    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md">
      <Eye className="h-4 w-4" />
      <span>
        {viewers.length === 1
          ? `${viewerNames} 상담원이 확인 중`
          : `${viewerNames} 상담원들이 확인 중`}
      </span>
    </div>
  );
}
