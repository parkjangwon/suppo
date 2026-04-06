"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@crinity/ui/components/ui/button";
import { Label } from "@crinity/ui/components/ui/label";
import { AttachmentUpload } from "./attachment-upload";
import { Paperclip } from "lucide-react";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";

interface CustomerReplyFormProps {
  ticketId: string;
}

export function CustomerReplyForm({ ticketId }: CustomerReplyFormProps) {
  const copy = useAdminCopy() as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;

    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("ticketId", ticketId);
      formData.append("content", content);

      files.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await fetch("/api/comments/public", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setContent("");
        setFiles([]);
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || t("customerReplyFailed", "답변 등록에 실패했습니다."));
      }
    } catch {
      setError(t("customerReplyError", "오류가 발생했습니다. 다시 시도해주세요."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4 border-t pt-8">
      <h3 className="text-lg font-medium">{t("customerReplyPlaceholder", "답변 추가")}</h3>
      
      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="content">{t("customerReplyPlaceholder", "추가 메시지")}</Label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[120px] p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t("customerReplyPlaceholder", "추가로 문의하실 내용을 입력해주세요.")}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Paperclip className="h-4 w-4" />
          <span>{t("commonAdd", "첨부 파일")}</span>
          <span className="text-xs text-gray-400">{t("commonNone", "(이미지, 문서 등)")}</span>
        </div>
        <AttachmentUpload 
          files={files} 
          onChange={setFiles}
          maxFiles={5}
          maxSize={10 * 1024 * 1024}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading || (!content.trim() && files.length === 0)}>
          {isLoading ? t("commonSending", "전송 중...") : t("commonSend", "전송")}
        </Button>
      </div>
    </form>
  );
}
