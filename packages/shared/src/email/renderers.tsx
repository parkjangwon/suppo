// 이메일 템플릿 렌더러 (Next.js 15에서 서버 컴포넌트 사용)
// Note: react-dom/server 제거, 대신 문자열 템플릿 사용

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

interface CSATSurveyInput {
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  ticketSubject: string;
}

function getTicketUrl(ticketNumber: string): string {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBaseUrl}/ticket/${ticketNumber}`;
}

function getAdminTicketUrl(ticketNumber: string): string {
  const baseUrl = process.env.ADMIN_BASE_URL ?? process.env.APP_BASE_URL ?? "http://localhost:3001";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBaseUrl}/admin/tickets?q=${ticketNumber}`;
}

function getSurveyUrl(ticketId: string): string {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBaseUrl}/survey/${ticketId}`;
}

function renderShell(title: string, content: string): string {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      body { margin: 0; padding: 24px; background-color: #f6f7fb; font-family: Arial, sans-serif; }
      .email-container { max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e8ebf0; }
      .content { padding: 24px; }
      h1 { margin: 0 0 16px; font-size: 20px; color: #111827; }
      p { margin: 0 0 12px; color: #1f2937; font-size: 14px; line-height: 1.7; }
      a { color: #2563eb; text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="content">
        <h1>${title}</h1>
        ${content}
      </div>
    </div>
  </body>
</html>`;
}

export function renderTicketCreatedCustomerEmail(input: TicketCreatedCustomerInput): RenderedEmail {
  const ticketUrl = getTicketUrl(input.ticketNumber);

  return {
    subject: `[크리니티 티켓] 문의가 접수되었습니다 (#${input.ticketNumber})`,
    body: renderShell(
      "문의 접수 안내",
      `<p>${input.customerName}님, 안녕하세요.</p>
      <p>문의가 정상적으로 접수되었습니다.<br>접수 번호: <strong>${input.ticketNumber}</strong></p>
      <p>제목: <strong>${input.ticketSubject}</strong></p>
      <p>진행 상태 확인: <a href="${ticketUrl}">${ticketUrl}</a></p>`
    )
  };
}

export function renderTicketCreatedNotificationEmail(input: TicketCreatedNotificationInput): RenderedEmail {
  const ticketUrl = getTicketUrl(input.ticketNumber);

  return {
    subject: `[크리니티 티켓] 신규 문의가 등록되었습니다 (#${input.ticketNumber})`,
    body: renderShell(
      "신규 문의 알림",
      `<p>새로운 고객 문의가 등록되었습니다.</p>
      <p>접수 번호: <strong>${input.ticketNumber}</strong></p>
      <p>고객명: <strong>${input.customerName}</strong></p>
      <p>제목: <strong>${input.ticketSubject}</strong></p>
      <p>티켓 확인: <a href="${ticketUrl}">${ticketUrl}</a></p>`
    )
  };
}

export function renderTicketAssignedEmail(input: TicketAssignedInput): RenderedEmail {
  const ticketUrl = getTicketUrl(input.ticketNumber);

  return {
    subject: `[크리니티 티켓] 담당 티켓이 배정되었습니다 (#${input.ticketNumber})`,
    body: renderShell(
      "담당 티켓 배정 안내",
      `<p>${input.assigneeName}님, 새로운 티켓이 배정되었습니다.</p>
      <p>접수 번호: <strong>${input.ticketNumber}</strong></p>
      <p>고객명: <strong>${input.customerName}</strong></p>
      <p>제목: <strong>${input.ticketSubject}</strong></p>
      <p>티켓 확인: <a href="${ticketUrl}">${ticketUrl}</a></p>`
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
      `<p>${receiverLabel}님에게 전달되는 알림입니다.</p>
      <p>접수 번호: <strong>${input.ticketNumber}</strong></p>
      <p>작성자: <strong>${input.commenterName}</strong></p>
      <p>댓글 확인: <a href="${ticketUrl}">${ticketUrl}</a></p>`
    )
  };
}

export function renderStatusChangedEmail(input: StatusChangedInput): RenderedEmail {
  const ticketUrl = getTicketUrl(input.ticketNumber);

  return {
    subject: `[크리니티 티켓] 처리 상태가 변경되었습니다 (#${input.ticketNumber})`,
    body: renderShell(
      "처리 상태 변경 안내",
      `<p>티켓 처리 상태가 변경되었습니다.</p>
      <p>접수 번호: <strong>${input.ticketNumber}</strong></p>
      <p>변경 전: <strong>${input.oldStatus}</strong></p>
      <p>변경 후: <strong>${input.newStatus}</strong></p>
      <p>상태 확인: <a href="${ticketUrl}">${ticketUrl}</a></p>`
    )
  };
}

interface SLAWarningInput {
  ticketNumber: string;
  assigneeName: string;
  targetLabel: string; // "첫 응답" | "해결"
  minutesRemaining: number;
}

interface SLABreachInput {
  ticketNumber: string;
  assigneeName: string;
  targetLabel: string;
}

export function renderSLAWarningEmail(input: SLAWarningInput): RenderedEmail {
  const ticketUrl = getAdminTicketUrl(input.ticketNumber);
  const hours = Math.floor(input.minutesRemaining / 60);
  const minutes = input.minutesRemaining % 60;
  const timeLabel = hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;

  return {
    subject: `[SLA 경고] 티켓 #${input.ticketNumber} — ${input.targetLabel} 마감 ${timeLabel} 전`,
    body: renderShell(
      "SLA 마감 임박 알림",
      `<p>${input.assigneeName}님, 안녕하세요.</p>
      <p>담당 티켓의 SLA 마감 시간이 얼마 남지 않았습니다.</p>
      <p>티켓 번호: <strong>${input.ticketNumber}</strong></p>
      <p>SLA 항목: <strong>${input.targetLabel}</strong></p>
      <p>남은 시간: <strong>${timeLabel}</strong></p>
      <p>지금 바로 확인하세요: <a href="${ticketUrl}">${ticketUrl}</a></p>`
    ),
  };
}

export function renderSLABreachEmail(input: SLABreachInput): RenderedEmail {
  const ticketUrl = getAdminTicketUrl(input.ticketNumber);

  return {
    subject: `[SLA 위반] 티켓 #${input.ticketNumber} — ${input.targetLabel} 마감 초과`,
    body: renderShell(
      "SLA 위반 알림",
      `<p>${input.assigneeName}님, 안녕하세요.</p>
      <p>담당 티켓의 SLA 마감 시간이 초과되었습니다.</p>
      <p>티켓 번호: <strong>${input.ticketNumber}</strong></p>
      <p>SLA 항목: <strong>${input.targetLabel}</strong></p>
      <p>즉시 확인해 주세요: <a href="${ticketUrl}">${ticketUrl}</a></p>`
    ),
  };
}

export function renderCSATSurveyEmail(input: CSATSurveyInput): RenderedEmail {
  const surveyUrl = getSurveyUrl(input.ticketId);

  return {
    subject: `[크리니티 티켓] 고객 만족도 조사에 참여해주세요 (#${input.ticketNumber})`,
    body: renderShell(
      "고객 만족도 조사",
      `<p>${input.customerName}님, 안녕하세요.</p>
      <p>문의하신 티켓이 해결되었습니다.<br>소중한 의견을 주시면 더 나은 서비스를 제공하는 데 큰 도움이 됩니다.</p>
      <p>티켓 번호: <strong>${input.ticketNumber}</strong></p>
      <p>제목: <strong>${input.ticketSubject}</strong></p>
      <p>아래 버튼을 클릭하시면 만족도 조사 페이지로 이동합니다.</p>
      <p>
        <a href="${surveyUrl}" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          만족도 조사 참여하기
        </a>
      </p>
      <p style="font-size: 12px; color: #666666;">이 설문은 티켓 해결 후 7일 동안 유효합니다.</p>`
    )
  };
}
