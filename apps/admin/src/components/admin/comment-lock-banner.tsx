"use client";

import { Lock } from "lucide-react";
import { Button } from "@suppo/ui/components/ui/button";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { copyText } from "@/lib/i18n/admin-copy-utils";

interface LockInfo {
  agentId: string;
  agentName: string;
  acquiredAt: string;
  expiresAt: string;
}

interface CommentLockBannerProps {
  lock: LockInfo | null;
  isLockedByMe: boolean;
  onRelease?: () => void;
}

export function CommentLockBanner({
  lock,
  isLockedByMe,
  onRelease,
}: CommentLockBannerProps) {
  const copy = useAdminCopy();
  const t = (key: string, fallback: string) => copyText(copy, key, fallback);
  if (!lock) return null;

  if (isLockedByMe) {
    return (
      <div className="flex items-center justify-between gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md mb-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          <span>{t("commentLockEditing", "댓글 편집 중 (다른 상담원이 편집할 수 없습니다)")}</span>
        </div>
        {onRelease && (
          <Button variant="ghost" size="sm" onClick={onRelease}>
            {t("commentLockRelease", "해제")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md mb-4">
      <Lock className="h-4 w-4" />
      <span>{t("commentLockOtherAgent", "{agentName} 상담원이 댓글을 편집 중입니다").replace("{agentName}", lock.agentName)}</span>
    </div>
  );
}
