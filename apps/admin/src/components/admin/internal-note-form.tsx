"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@suppo/ui/components/ui/button";
import { Textarea } from "@suppo/ui/components/ui/textarea";
import { Checkbox } from "@suppo/ui/components/ui/checkbox";
import { Label } from "@suppo/ui/components/ui/label";
import { toast } from "sonner";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";

interface InternalNoteFormProps {
  ticketId: string;
}

export function InternalNoteForm({ ticketId }: InternalNoteFormProps) {
  const copy = useAdminCopy() as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error(t("internalNoteContentRequired", "내용을 입력해주세요."));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          content,
          isInternal,
        }),
      });

      if (!response.ok) {
        throw new Error(t("internalNoteFailed", "응답 등록 실패"));
      }

      toast.success(isInternal ? t("internalNoteSuccess", "내부 메모가 등록되었습니다.") : t("internalNoteResponseSuccess", "응답이 등록되었습니다."));
      setContent("");
      setIsInternal(false);
      router.refresh();
    } catch (error) {
      toast.error(t("internalNoteError", "응답 등록 중 오류가 발생했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6 border-t pt-6">
      <div className="space-y-2">
        <Label htmlFor="content" className="sr-only">{t("commentWriteAriaLabel", "응답 작성")}</Label>
        <Textarea
          id="content"
          placeholder={t("internalNotePlaceholder", "응답 또는 내부 메모를 작성하세요...")}
          className="min-h-[120px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSubmitting}
          aria-label={t("commentWriteAriaLabel", "응답 작성")}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isInternal"
            checked={isInternal}
            onCheckedChange={(checked) => setIsInternal(checked as boolean)}
            disabled={isSubmitting}
            aria-label={t("commentInternalNoteAriaLabel", "내부 메모로 저장")}
          />
          <Label
            htmlFor="isInternal"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t("commentInternalNoteAriaLabel", "내부 메모로 저장 (고객에게 보이지 않음)")}
          </Label>
        </div>

        <Button type="submit" disabled={isSubmitting || !content.trim()}>
          {isSubmitting ? t("commonSending", "전송 중...") : t("commonSend", "전송")}
        </Button>
      </div>
    </form>
  );
}
