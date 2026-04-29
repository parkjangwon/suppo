import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { FileText, Image as ImageIcon, Download, User, Headphones } from "lucide-react";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  isInternal: boolean;
  author: { name: string } | null;
  attachments: { id: string; url: string; filename: string; mimeType?: string }[];
}

interface CommentListProps {
  comments: Comment[];
}

function isImageFile(mimeType?: string): boolean {
  if (!mimeType) {
    return false;
  }
  return mimeType.startsWith("image/");
}

function getFileIcon(mimeType?: string) {
  if (mimeType && mimeType.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4" />;
  }
  return <FileText className="h-4 w-4" />;
}

export function CommentList({ comments }: CommentListProps) {
  const copy = useAdminCopy() as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  if (!comments || comments.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Headphones className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-slate-500">{t("commonNotFound", "아직 답변이 없습니다.")}</p>
        <p className="text-sm text-slate-400 mt-1">{t("commonNone", "첫 번째 답변을 기다리고 있어요!")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => {
        const isCustomer = !comment.author;
        
        return (
          <div
            key={comment.id}
            className={`p-5 rounded-xl border ${
              isCustomer
                ? "bg-white border-slate-200"
                : "bg-blue-50/50 border-blue-100"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCustomer 
                    ? "bg-slate-100 text-slate-600" 
                    : "bg-blue-100 text-blue-600"
                }`}>
                  {isCustomer ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Headphones className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <span className="font-semibold text-sm">
                    {isCustomer ? t("commentAuthorCustomer", "고객") : comment.author?.name || t("commentAuthorAgent", "상담원")}
                  </span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    isCustomer 
                      ? "bg-slate-100 text-slate-600" 
                      : "bg-blue-100 text-blue-600"
                  }`}>
                    {isCustomer ? t("commentRoleCustomer", "작성자") : t("commentRoleAgent", "상담원")}
                  </span>
                </div>
              </div>
              <span className="text-xs text-slate-400">
                {format(new Date(comment.createdAt), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
              </span>
            </div>
            
            <div className="pl-11">
              <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                {comment.content}
              </div>
              
              {comment.attachments && comment.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 font-medium mb-3 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {t("commonAdd", "첨부 파일")} {comment.attachments.length}개
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {comment.attachments.map((attachment) => (
                      <div key={attachment.id} className="group">
                        {isImageFile(attachment.mimeType) || attachment.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <a
                            href={`/api/attachments/${attachment.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block relative"
                          >
                            <img
                              src={`/api/attachments/${attachment.id}`}
                              alt={attachment.filename}
                              className="h-24 w-24 object-cover rounded-lg border border-slate-200 group-hover:border-blue-400 transition-all group-hover:shadow-md"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <Download className="h-5 w-5 text-white" />
                            </div>
                          </a>
                        ) : (
                          <a
                            href={`/api/attachments/${attachment.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:border-blue-400 hover:text-blue-600 hover:shadow-sm transition-all"
                          >
                            {getFileIcon(attachment.mimeType)}
                            <span className="max-w-[140px] truncate">{attachment.filename}</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
