import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CommentList } from "./comment-list";
import { CustomerReplyForm } from "./customer-reply-form";
import { TransferDialog, type TransferAgent } from "@/components/admin/transfer-dialog";

interface PublicTicketDetailProps {
  ticket: {
    id: string;
    title: string;
    status: string;
    ticketNumber: string;
    createdAt: Date;
    description: string;
    attachments: { id: string; url: string; filename: string }[];
    comments: {
      id: string;
      content: string;
      createdAt: Date;
      isInternal: boolean;
      author: { name: string } | null;
      attachments: { id: string; url: string; filename: string }[];
    }[];

  };
  transfer?: {
    currentAssigneeId: string | null;
    activeAgents: TransferAgent[];
  };
}

const statusColors: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  OPEN: "접수",
  IN_PROGRESS: "처리중",
  RESOLVED: "해결됨",
  CLOSED: "종료",
};

export function PublicTicketDetail({ ticket, transfer }: PublicTicketDetailProps) {
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-8 pb-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
          <div className="flex items-center gap-2">
            {transfer ? (
              <TransferDialog
                ticketId={ticket.id}
                currentAssigneeId={transfer.currentAssigneeId}
                activeAgents={transfer.activeAgents}
              />
            ) : null}
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                statusColors[ticket.status] || "bg-gray-100 text-gray-800"
              }`}
            >
              {statusLabels[ticket.status] || ticket.status}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
          <span>티켓 번호: {ticket.ticketNumber}</span>
          <span>•</span>
          <span>작성일: {format(new Date(ticket.createdAt), "yyyy년 MM월 dd일", { locale: ko })}</span>
        </div>

        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap">{ticket.description}</div>
        </div>

        {ticket.attachments && ticket.attachments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">첨부 파일</h4>
            <div className="space-y-2">
              {ticket.attachments.map((attachment) => (
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
          </div>
        )}
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-medium mb-6">답변 내역</h3>
        <CommentList comments={ticket.comments} />
      </div>

      {ticket.status !== "CLOSED" && (
        <CustomerReplyForm ticketId={ticket.id} />
      )}
    </div>
  );
}
