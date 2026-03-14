"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AttachmentUpload } from "@/components/ticket/attachment-upload";
import { Paperclip, Image as ImageIcon, FileText, Download } from "lucide-react";

export interface Comment {
  id: string;
  authorType: string;
  authorName: string;
  content: string;
  isInternal: boolean;
  createdAt: Date | string;
  attachments: { id: string; fileName: string; fileUrl: string; mimeType: string }[];
}

interface CommentSectionProps {
  ticketId: string;
  comments: Comment[];
  canEdit: boolean;
}

function isImageFile(mimeType?: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("image/");
}

function getFileIcon(mimeType?: string | null) {
  if (!mimeType) return <FileText className="h-4 w-4" />;
  if (mimeType.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4" />;
  }
  return <FileText className="h-4 w-4" />;
}

export function CommentSection({ ticketId, comments, canEdit }: CommentSectionProps) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

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
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-500 font-medium">첨부 파일</p>
                  <div className="flex flex-wrap gap-2">
                    {comment.attachments.map((att) => (
                      <div key={att.id} className="group">
                        {isImageFile(att.mimeType) ? (
                          <a
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block relative"
                          >
                            <img
                              src={att.fileUrl}
                              alt={att.fileName}
                              className="h-24 w-24 object-cover rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <Download className="h-5 w-5 text-white" />
                            </div>
                          </a>
                        ) : (
                          <a
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors"
                          >
                            {getFileIcon(att.mimeType)}
                            <span className="max-w-[150px] truncate">{att.fileName}</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
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
              <Button 
                onClick={submitReply} 
                disabled={loading || (!reply.trim() && files.length === 0)}
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

