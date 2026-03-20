"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AttachmentUpload } from "@/components/ticket/attachment-upload";
import { TemplateSelector } from "./template-selector";
import { KnowledgeAssistant } from "./knowledge-assistant";
import { CommentThread } from "./comment-thread";
import { CommentLockBanner } from "./comment-lock-banner";
import { useCommentLock } from "@/hooks/use-comment-lock";
import { Paperclip, Sparkles } from "lucide-react";
import { toast } from "sonner";

export interface Comment {
  id: string;
  authorType: string;
  authorId: string | null;
  authorName: string;
  content: string;
  isInternal: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  attachments: { id: string; fileName: string; fileUrl: string; mimeType: string }[];
}

interface CommentSectionProps {
  ticketId: string;
  comments: Comment[];
  canEdit: boolean;
  requestTypeId?: string | null;
  onAiSuggestion?: () => Promise<string | null>;
  isGeneratingSuggestion?: boolean;
  currentAgentId: string;
  isAdmin: boolean;
  ticketAssigneeId: string | null;
}

export function CommentSection({
  ticketId,
  comments,
  canEdit,
  requestTypeId,
  onAiSuggestion,
  isGeneratingSuggestion,
  currentAgentId,
  isAdmin,
  ticketAssigneeId,
}: CommentSectionProps) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const { lock, isLockedByMe, isLocked, acquireLock, releaseLock } = useCommentLock({ ticketId });

  async function handleAiSuggestion() {
    if (!onAiSuggestion) return;

    try {
      const suggestion = await onAiSuggestion();
      if (suggestion) {
        setReply((prev) => prev + (prev ? "\n\n" : "") + suggestion);
        toast.success("AI 답변 제안이 입력되었습니다.");
      }
    } catch (error) {
      toast.error("AI 답변 생성 중 오류가 발생했습니다.");
    }
  }

  async function submitReply() {
    if (!reply.trim() && files.length === 0) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("ticketId", ticketId);
    formData.append("content", reply);
    formData.append("isInternal", String(isInternal));

    files.forEach((file) => {
      formData.append("attachments", file);
    });

    const res = await fetch("/api/comments", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      setReply("");
      setIsInternal(false);
      setFiles([]);
      await releaseLock();
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>대화 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <CommentThread
            comments={comments}
            currentAgentId={currentAgentId}
            isAdmin={isAdmin}
            ticketAssigneeId={ticketAssigneeId}
            onCommentUpdated={() => router.refresh()}
          />
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>응답 작성</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CommentLockBanner
              lock={lock}
              isLockedByMe={isLockedByMe}
              onRelease={releaseLock}
            />
            <Label htmlFor="reply" className="sr-only">
              응답 작성
            </Label>
            <Textarea
              id="reply"
              aria-label="응답 작성"
              placeholder={isLocked && !isLockedByMe ? "다른 상담원이 편집 중입니다..." : "응답을 입력하세요..."}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onFocus={async () => {
                if (!isLocked || isLockedByMe) {
                  await acquireLock();
                }
              }}
              disabled={isLocked && !isLockedByMe}
              rows={4}
            />

            <KnowledgeAssistant
              onInsertContent={(content) =>
                setReply((prev) => prev + (prev ? "\n\n" : "") + content)
              }
            />

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Paperclip className="h-4 w-4" />
                <span>첨부 파일</span>
                <span className="text-xs text-gray-400">(이미지, 문서 등)</span>
              </div>
              <AttachmentUpload
                files={files}
                onChange={setFiles}
                maxFiles={5}
                maxSize={10 * 1024 * 1024}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="internal"
                    aria-label="남부 메모로 저장"
                    checked={isInternal}
                    onCheckedChange={(checked) => setIsInternal(checked === true)}
                  />
                  <Label htmlFor="internal" className="text-sm cursor-pointer">
                    남부 메모로 저장
                  </Label>
                </div>
                <TemplateSelector
                  requestTypeId={requestTypeId}
                  onSelect={(content) =>
                    setReply((prev) => prev + (prev ? "\n\n" : "") + content)
                  }
                  disabled={loading}
                />
                {onAiSuggestion && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAiSuggestion}
                    disabled={isGeneratingSuggestion || loading}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isGeneratingSuggestion ? "생성 중..." : "AI 답변 제안"}
                  </Button>
                )}
              </div>
              <Button
                onClick={submitReply}
                disabled={loading || (isLocked && !isLockedByMe) || (!reply.trim() && files.length === 0)}
              >
                {loading ? "전송중..." : "전송"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
