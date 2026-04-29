"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader } from "@suppo/ui/components/ui/card";
import { Badge } from "@suppo/ui/components/ui/badge";
import { Button } from "@suppo/ui/components/ui/button";
import { Textarea } from "@suppo/ui/components/ui/textarea";
import { Pencil, Trash2, X, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@suppo/ui/components/ui/alert-dialog";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";

interface Comment {
  id: string;
  authorType: string;
  authorId: string | null;
  authorName: string;
  content: string;
  isInternal: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  attachments: { id: string; fileName: string; fileUrl: string }[];
}

interface CommentThreadProps {
  comments: Comment[];
  currentAgentId: string;
  isAdmin: boolean;
  ticketAssigneeId: string | null;
  onCommentUpdated?: () => void;
}

export function CommentThread({
  comments,
  currentAgentId,
  isAdmin,
  ticketAssigneeId,
  onCommentUpdated,
}: CommentThreadProps) {
  const copy = useAdminCopy() as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!comments || comments.length === 0) {
    return null;
  }

  const canEditComment = (comment: Comment): boolean => {
    if (comment.authorType !== "AGENT") return false;
    const isAuthor = comment.authorId === currentAgentId;
    const isAssigned = ticketAssigneeId === currentAgentId;
    return isAdmin || isAuthor || isAssigned;
  };

  const isEdited = (comment: Comment): boolean => {
    const created = new Date(comment.createdAt).getTime();
    const updated = new Date(comment.updatedAt).getTime();
    return updated > created + 1000;
  };

  const handleEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) {
      toast.error(t("commentContentRequired", "내용을 입력해주세요"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t("commentUpdateFailed", "수정에 실패했습니다"));
      }

      toast.success(t("commentUpdateSuccess", "댓글이 수정되었습니다"));
      setEditingId(null);
      setEditContent("");
      onCommentUpdated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("commentUpdateError", "수정에 실패했습니다"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t("commentDeleteFailed", "삭제에 실패했습니다"));
      }

      toast.success(t("commentDeleteSuccess", "댓글이 삭제되었습니다"));
      onCommentUpdated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("commentDeleteError", "삭제에 실패했습니다"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {comments.map((comment) => {
        const isCustomer = comment.authorType === "CUSTOMER";
        const isInternal = comment.isInternal;
        const isEditing = editingId === comment.id;
        const editable = canEditComment(comment);
        const wasEdited = isEdited(comment);

        return (
          <Card
            key={comment.id}
            className={`
              ${isCustomer ? "mr-12" : "ml-12"}
              ${isInternal ? "bg-amber-50/50 border-amber-200" : ""}
            `}
          >
            <CardHeader
              className={`py-3 px-4 flex flex-row items-center justify-between ${
                isInternal ? "bg-amber-100/50" : "bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                    {comment.authorName}
                </span>
                {isCustomer ? (
                  <Badge variant="outline" className="text-xs">
                    {t("commentAuthorCustomer", "고객")}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    {t("commentAuthorAgent", "상담원")}
                  </Badge>
                )}
                {isInternal && (
                  <Badge
                    variant="destructive"
                    className="text-xs bg-amber-500 hover:bg-amber-600"
                  >
                    {t("commentInternalNoteAriaLabel", "내부 메모")}
                  </Badge>
                )}
                {wasEdited && !isEditing && (
                  <span className="text-xs text-muted-foreground">({t("commentUpdateSuccess", "수정됨")})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(
                    new Date(comment.createdAt),
                    "yyyy.MM.dd HH:mm",
                    { locale: ko }
                  )}
                </span>
                {editable && !isEditing && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(comment)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            {t("commentDeleteSuccess", "댓글 삭제")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("commentDeleteError", "이 댓글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("commonCancel", "취소")}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(comment.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {t("commonDelete", "삭제")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="py-4 px-4">
              {isEditing ? (
                <div className="space-y-3">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[100px]"
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t("commonCancel", "취소")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(comment.id)}
                      disabled={isSubmitting}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {t("commonSave", "저장")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="whitespace-pre-wrap text-sm">
                    {comment.content}
                  </div>

                  {comment.attachments && comment.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <ul className="space-y-1">
                        {comment.attachments.map((file) => (
                          <li key={file.id}>
                            <a
                              href={`/api/attachments/${file.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {file.fileName}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
