"use client";

type ChatComment = {
  id: string;
  authorType: string;
  authorName: string;
  content: string;
  createdAt: string;
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
  }>;
};

export function ChatThread({ comments }: { comments: ChatComment[] }) {
  return (
    <div className="space-y-3">
      {comments.map((comment) => {
        const isCustomer = comment.authorType === "CUSTOMER";

        return (
          <div
            key={comment.id}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
              isCustomer
                ? "ml-auto bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-900"
            }`}
          >
            <div className={`mb-1 text-xs ${isCustomer ? "text-slate-300" : "text-slate-500"}`}>
              {comment.authorName}
            </div>
            <div className="whitespace-pre-wrap">{comment.content}</div>
            {comment.attachments.length > 0 ? (
              <div className="mt-2 space-y-1">
                {comment.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`block text-xs underline ${isCustomer ? "text-slate-200" : "text-blue-600"}`}
                  >
                    {attachment.fileName}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
