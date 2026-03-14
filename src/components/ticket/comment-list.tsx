import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  isInternal: boolean;
  author: { name: string } | null;
  attachments: { id: string; url: string; filename: string }[];
}

interface CommentListProps {
  comments: Comment[];
}

export function CommentList({ comments }: CommentListProps) {
  if (!comments || comments.length === 0) {
    return <div className="text-center text-gray-500 py-8">아직 답변이 없습니다.</div>;
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => {
        const isCustomer = !comment.author;
        
        return (
          <div
            key={comment.id}
            className={`flex flex-col ${isCustomer ? "items-start" : "items-end"}`}
          >
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-medium text-sm">
                {isCustomer ? "고객" : comment.author?.name || "상담원"}
              </span>
              <span className="text-xs text-gray-500">
                {format(new Date(comment.createdAt), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
              </span>
            </div>
            
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                isCustomer
                  ? "bg-gray-100 text-gray-900"
                  : "bg-blue-50 text-blue-900"
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{comment.content}</div>
              
              {comment.attachments && comment.attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-black/10 space-y-2">
                  {comment.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                      {attachment.filename}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
