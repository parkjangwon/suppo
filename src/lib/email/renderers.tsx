import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

export interface RenderedEmail {
  subject: string;
  body: string;
}

interface TicketCreatedCustomerInput {
  ticketNumber: string;
  ticketSubject: string;
  customerName: string;
}

interface TicketCreatedNotificationInput {
  ticketNumber: string;
  ticketSubject: string;
  customerName: string;
}

interface TicketAssignedInput {
  ticketNumber: string;
  ticketSubject: string;
  customerName: string;
  assigneeName: string;
}

interface NewCommentInput {
  ticketNumber: string;
  commenterName: string;
  recipientType: "CUSTOMER" | "AGENT";
}

interface StatusChangedInput {
  ticketNumber: string;
  oldStatus: string;
  newStatus: string;
}

function getTicketUrl(ticketNumber: string): string {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBaseUrl}/ticket/${ticketNumber}`;
}

function renderShell(title: string, content: React.ReactNode): string {
  return `<!doctype html>${renderToStaticMarkup(
    <html lang="ko">
      <body style={{ margin: "0", padding: "24px", backgroundColor: "#f6f7fb", fontFamily: "Arial, sans-serif" }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ maxWidth: "640px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e8ebf0" }}>
          <tbody>
            <tr>
              <td style={{ padding: "24px" }}>
                <h1 style={{ margin: "0 0 16px", fontSize: "20px", color: "#111827" }}>{title}</h1>
                <div style={{ color: "#1f2937", fontSize: "14px", lineHeight: "1.7" }}>{content}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  )}`;
}

export function renderTicketCreatedCustomerEmail(input: TicketCreatedCustomerInput): RenderedEmail {
  const ticketUrl = getTicketUrl(input.ticketNumber);

  return {
    subject: `[크리니티 티켓] 문의가 접수되었습니다 (#${input.ticketNumber})`,
    body: renderShell(
      "문의 접수 안내",
      <>
        <p>{input.customerName}님, 안녕하세요.</p>
        <p>
          문의가 정상적으로 접수되었습니다.<br />
          접수 번호: <strong>{input.ticketNumber}</strong>
        </p>
        <p>
          제목: <strong>{input.ticketSubject}</strong>
        </p>
        <p>
          진행 상태 확인: <a href={ticketUrl}>{ticketUrl}</a>
        </p>
      </>
    )
  };
}

export function renderTicketCreatedNotificationEmail(input: TicketCreatedNotificationInput): RenderedEmail {
  const ticketUrl = getTicketUrl(input.ticketNumber);

  return {
    subject: `[크리니티 티켓] 신규 문의가 등록되었습니다 (#${input.ticketNumber})`,
    body: renderShell(
      "신규 문의 알림",
      <>
        <p>새로운 고객 문의가 등록되었습니다.</p>
        <p>
          접수 번호: <strong>{input.ticketNumber}</strong>
        </p>
        <p>
          고객명: <strong>{input.customerName}</strong>
        </p>
        <p>
          제목: <strong>{input.ticketSubject}</strong>
        </p>
        <p>
          티켓 확인: <a href={ticketUrl}>{ticketUrl}</a>
        </p>
      </>
    )
  };
}

export function renderTicketAssignedEmail(input: TicketAssignedInput): RenderedEmail {
  const ticketUrl = getTicketUrl(input.ticketNumber);

  return {
    subject: `[크리니티 티켓] 담당 티켓이 배정되었습니다 (#${input.ticketNumber})`,
    body: renderShell(
      "담당 티켓 배정 안내",
      <>
        <p>{input.assigneeName}님, 새로운 티켓이 배정되었습니다.</p>
        <p>
          접수 번호: <strong>{input.ticketNumber}</strong>
        </p>
        <p>
          고객명: <strong>{input.customerName}</strong>
        </p>
        <p>
          제목: <strong>{input.ticketSubject}</strong>
        </p>
        <p>
          티켓 확인: <a href={ticketUrl}>{ticketUrl}</a>
        </p>
      </>
    )
  };
}

export function renderNewCommentEmail(input: NewCommentInput): RenderedEmail {
  const ticketUrl = getTicketUrl(input.ticketNumber);
  const receiverLabel = input.recipientType === "CUSTOMER" ? "고객" : "담당자";

  return {
    subject: `[크리니티 티켓] 새 댓글이 등록되었습니다 (#${input.ticketNumber})`,
    body: renderShell(
      "새 댓글 알림",
      <>
        <p>{receiverLabel}님에게 전달되는 알림입니다.</p>
        <p>
          접수 번호: <strong>{input.ticketNumber}</strong>
        </p>
        <p>
          작성자: <strong>{input.commenterName}</strong>
        </p>
        <p>
          댓글 확인: <a href={ticketUrl}>{ticketUrl}</a>
        </p>
      </>
    )
  };
}

export function renderStatusChangedEmail(input: StatusChangedInput): RenderedEmail {
  const ticketUrl = getTicketUrl(input.ticketNumber);

  return {
    subject: `[크리니티 티켓] 처리 상태가 변경되었습니다 (#${input.ticketNumber})`,
    body: renderShell(
      "처리 상태 변경 안내",
      <>
        <p>티켓 처리 상태가 변경되었습니다.</p>
        <p>
          접수 번호: <strong>{input.ticketNumber}</strong>
        </p>
        <p>
          변경 전: <strong>{input.oldStatus}</strong>
        </p>
        <p>
          변경 후: <strong>{input.newStatus}</strong>
        </p>
        <p>
          상태 확인: <a href={ticketUrl}>{ticketUrl}</a>
        </p>
      </>
    )
  };
}
