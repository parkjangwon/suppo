"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export interface Comment {
  id: string;
  authorType: string;
  authorName: string;
  content: string;
  isInternal: boolean;
  createdAt: Date | string;
  attachments: { id: string; fileName: string; fileUrl: string }[];
}

interface CommentSectionProps {
  ticketId: string;
  comments: Comment[];
  canEdit: boolean;
}

export function CommentSection({ ticketId, comments, canEdit }: CommentSectionProps) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submitReply() {
    if (!reply.trim()) return;
    setLoading(true);

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId,
        content: reply,
        isInternal,
      }),
    });

    if (res.ok) {
      setReply("");
      setIsInternal(false);
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
        <CardContent className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-4 rounded-lg ${
                comment.isInternal
                  ? "bg-amber-50 border border-amber-200"
                  : comment.authorType === "AGENT"
                  ? "bg-blue-50"
                  : "bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{comment.authorName}</span>
                  <span className="text-xs text-gray-500">
                    {comment.authorType === "AGENT" ? "상담원" : "고객"}
                  </span>
                  {comment.isInternal && (
                    <Badge variant="secondary" className="text-xs">
                      내부 메모
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(comment.createdAt).toLocaleString("ko-KR")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
              {comment.attachments.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {comment.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {att.fileName}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}

          {comments.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              아직 대화가 없습니다
            </p>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>응답 작성</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="reply" className="sr-only">응답 작성</Label>
            <Textarea
              id="reply"
              aria-label="응답 작성"
              placeholder="응답을 입력하세요..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="internal"
                  aria-label="내부 메모로 저장"
                  checked={isInternal}
                  onCheckedChange={(checked) => setIsInternal(checked === true)}
                />
                <Label htmlFor="internal" className="text-sm cursor-pointer">
                  내부 메모로 저장
                </Label>
              </div>
              <Button onClick={submitReply} disabled={loading || !reply.trim()}>
                {loading ? "전송중..." : "전송"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

