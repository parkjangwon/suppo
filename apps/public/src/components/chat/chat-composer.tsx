"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@crinity/ui/components/ui/button";
import { Label } from "@crinity/ui/components/ui/label";
import { Textarea } from "@crinity/ui/components/ui/textarea";

import { AttachmentUpload } from "@/components/ticket/attachment-upload";

export function ChatComposer({
  onSend,
  onTypingChange,
}: {
  onSend: (payload: { content: string; files: File[] }) => Promise<void>;
  onTypingChange?: (isTyping: boolean) => void;
}) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const typingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!onTypingChange) {
      return;
    }

    if (content.trim().length > 0) {
      onTypingChange(true);
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }
      typingTimerRef.current = window.setTimeout(() => {
        onTypingChange(false);
      }, 1200);
    } else {
      onTypingChange(false);
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }

    return () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, [content, onTypingChange]);

  async function handleSend() {
    if (!content.trim() && files.length === 0) {
      return;
    }

    setIsSending(true);
    try {
      await onSend({ content, files });
      setContent("");
      setFiles([]);
      onTypingChange?.(false);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="space-y-2">
        <Label htmlFor="chat-message">메시지</Label>
        <Textarea
          id="chat-message"
          aria-label="메시지"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={4}
          placeholder="메시지를 입력하세요"
        />
      </div>
      <div className="space-y-2">
        <Label>첨부 파일</Label>
        <AttachmentUpload files={files} onChange={setFiles} maxFiles={5} inputAriaLabel="첨부 파일" />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSend} disabled={isSending}>
          {isSending ? "보내는 중..." : "보내기"}
        </Button>
      </div>
    </div>
  );
}
