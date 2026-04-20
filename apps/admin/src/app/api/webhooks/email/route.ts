import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@crinity/db";
import { dispatchEmailOutboxSoon } from "@crinity/shared/email/dispatch-trigger";
import { enqueueInternalCommentNotifications } from "@crinity/shared/email/enqueue";
import { processAttachments } from "@crinity/shared/storage/attachment-service";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * 이메일 수신 웹훅 스키마
 * - SendGrid, Mailgun, AWS SES, Postmark 등 표준 이메일 웹훅 형식 지원
 */
const emailWebhookSchema = z.object({
  // 헤더 정보
  messageId: z.string(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).optional(),
  subject: z.string(),
  from: z.string().email(),
  fromName: z.string().optional(),
  to: z.string().email(),
  
  // 본문
  text: z.string().optional(),
  html: z.string().optional(),
  
  // 첨부파일 (옵션)
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(), // base64
    contentType: z.string(),
  })).optional(),
});

/**
 * Verify HMAC-SHA256 signature for webhook authenticity
 */
function verifyWebhookSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;

  const expectedSignature = createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");

  try {
    const sigBuffer = Buffer.from(signature.replace("sha256=", ""), "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * 이메일 수신 웹훅
 * - 티켓 생성 또는 기존 티켓에 댓글 추가
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    
    const apiKey = request.headers.get("x-api-key");
    const signature = request.headers.get("x-webhook-signature");
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;
    const expectedApiKey = process.env.EMAIL_WEBHOOK_API_KEY;
    
    let isAuthorized = false;
    
    if (webhookSecret && signature) {
      isAuthorized = verifyWebhookSignature(rawBody, signature, webhookSecret);
    } else if (expectedApiKey && apiKey) {
      isAuthorized = apiKey === expectedApiKey;
    }
    
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const validated = emailWebhookSchema.parse(body);

    const threadedTicketId = await findTicketByMessageId(
      validated.inReplyTo,
      validated.references
    );

    if (threadedTicketId) {
      return await addCommentToTicketById(threadedTicketId, validated);
    }

    const ticketNumber = extractTicketNumber(validated.subject);
    if (ticketNumber) {
      return await addCommentToTicket(ticketNumber, validated);
    }

    return await createTicketFromEmail(validated);
  } catch (error) {
    console.error("Email webhook error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Subject에서 티켓 번호 추출
 * - [TKT-123], [#123], Ticket 123 등 다양한 형식 지원
 */
function extractTicketNumber(subject: string): string | null {
  const fullTicketMatch = subject.match(/\b(TKT-\d{4}-\d{6})\b/i);
  if (fullTicketMatch) {
    return fullTicketMatch[1].toUpperCase();
  }

  // [TKT-123] 또는 [#123] 형식
  const bracketMatch = subject.match(/\[(?:TKT-|#)(\d+)\]/i);
  if (bracketMatch) {
    return `TKT-${bracketMatch[1]}`;
  }

  // Subject에 "Ticket 123" 형식
  const ticketMatch = subject.match(/Ticket\s+(\d+)/i);
  if (ticketMatch) {
    return `TKT-${ticketMatch[1]}`;
  }

  // Message-ID 기반 스레드 매핑 조회
  return null;
}

/**
 * 이메일 스레드 매핑 조회
 */
async function findTicketByMessageId(
  inReplyTo: string | undefined,
  references: string[] | undefined
): Promise<string | null> {
  const messageIds = [
    inReplyTo,
    ...(references || []),
  ].filter(Boolean) as string[];

  if (messageIds.length === 0) return null;

  const mapping = await prisma.emailThreadMapping.findFirst({
    where: {
      messageId: { in: messageIds },
    },
    orderBy: { createdAt: "desc" },
  });

  return mapping?.ticketId || null;
}

async function processInboundAttachments(
  attachments: z.infer<typeof emailWebhookSchema>["attachments"],
  ticketId: string,
) {
  const processed: Awaited<ReturnType<typeof processAttachments>> = [];
  const errors: string[] = [];

  for (const attachment of attachments ?? []) {
    try {
      const content = Buffer.from(attachment.content, "base64");
      const file = new File([content], attachment.filename, {
        type: attachment.contentType,
      });
      const [saved] = await processAttachments([file], ticketId);
      if (saved) {
        processed.push(saved);
      }
    } catch (error) {
      errors.push(
        error instanceof Error
          ? `${attachment.filename}: ${error.message}`
          : `${attachment.filename}: attachment processing failed`,
      );
    }
  }

  return {
    processed,
    processingError: errors.length > 0 ? errors.join(" | ") : null,
  };
}

async function addCommentToTicketById(
  ticketId: string,
  email: z.infer<typeof emailWebhookSchema>
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    return createTicketFromEmail(email);
  }

  return addCommentToExistingTicket(ticket, email);
}

/**
 * 기존 티켓에 댓글 추가
 */
async function addCommentToTicket(
  ticketNumber: string,
  email: z.infer<typeof emailWebhookSchema>
): Promise<NextResponse> {
  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber },
  });

  if (!ticket) {
    // 티켓을 찾을 수 없으면 새 티켓으로 생성
    return createTicketFromEmail(email);
  }

  return addCommentToExistingTicket(ticket, email);
}

async function addCommentToExistingTicket(
  ticket: {
    id: string;
    ticketNumber: string;
    status: string;
    customerEmail: string;
    customerName: string;
    subject: string;
    assigneeId: string | null;
  },
  email: z.infer<typeof emailWebhookSchema>
): Promise<NextResponse> {
  const { processed, processingError } = await processInboundAttachments(
    email.attachments,
    ticket.id,
  );

  // 이메일 본문 정제 (인용문, 서명 제거)
  const cleanContent = cleanEmailContent(email.text || email.html || "");

  // 댓글 생성
  const comment = await prisma.comment.create({
    data: {
      ticketId: ticket.id,
      authorType: "CUSTOMER",
      authorName: email.fromName || email.from.split("@")[0],
      authorEmail: email.from,
      content: cleanContent,
      isInternal: false,
      attachments: processed.length > 0
        ? {
            create: processed.map((attachment) => ({
              ticketId: ticket.id,
              fileName: attachment.fileName,
              fileSize: attachment.fileSize,
              mimeType: attachment.mimeType,
              fileUrl: attachment.fileUrl,
              uploadedBy: email.fromName || email.from,
            })),
          }
        : undefined,
    },
  });

  // 이메일 스레드 매핑 저장
  await prisma.emailThreadMapping.create({
    data: {
      ticketId: ticket.id,
      messageId: email.messageId,
      inReplyTo: email.inReplyTo,
      references: email.references ? JSON.stringify(email.references) : null,
      subject: email.subject,
      fromAddress: email.from,
      toAddress: email.to,
      isProcessed: true,
      processedAt: new Date(),
      processingError,
    },
  });

  // 티켓 상태 업데이트 (고객 응답 대기에서 진행중으로)
  if (ticket.status === "WAITING") {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "OPEN" },
    });
  }

  // 활동 로그 기록
  await prisma.ticketActivity.create({
    data: {
      ticketId: ticket.id,
      actorType: "CUSTOMER",
      action: "CREATED",
      newValue: "고객 이메일 회신",
    },
  });

  const assignee = ticket.assigneeId
    ? await prisma.agent.findUnique({
        where: { id: ticket.assigneeId },
        select: { email: true },
      })
    : null;
  const emailSettings = await prisma.emailSettings.findUnique({
    where: { id: "default" },
    select: { notificationEmail: true },
  });

  await enqueueInternalCommentNotifications(
    [assignee?.email ?? null, emailSettings?.notificationEmail ?? null],
    ticket.ticketNumber,
    email.fromName || email.from.split("@")[0],
    undefined,
    { ticketId: ticket.id, commentId: comment.id },
  );
  dispatchEmailOutboxSoon();

  return NextResponse.json({
    success: true,
    action: "comment_added",
    ticketNumber: ticket.ticketNumber,
    commentId: comment.id,
  });
}

/**
 * 이메일로 새 티켓 생성
 */
async function createTicketFromEmail(
  email: z.infer<typeof emailWebhookSchema>
): Promise<NextResponse> {
  // 이메일 본문 정제
  const cleanContent = cleanEmailContent(email.text || email.html || "");

  // 티켓 번호 생성
  const ticketNumber = await generateTicketNumber();

  // 기본 카테고리 조회
  const defaultCategory = await prisma.category.findFirst({
    orderBy: { sortOrder: "asc" },
  });

  if (!defaultCategory) {
    return NextResponse.json(
      { error: "No category available" },
      { status: 500 }
    );
  }

  // 티켓 생성
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      customerName: email.fromName || email.from.split("@")[0],
      customerEmail: email.from,
      subject: email.subject,
      description: cleanContent,
      categoryId: defaultCategory.id,
      priority: "MEDIUM",
      status: "OPEN",
      source: "EMAIL",
    },
  });

  const { processed, processingError } = await processInboundAttachments(
    email.attachments,
    ticket.id,
  );

  if (processed.length > 0) {
    await prisma.attachment.createMany({
      data: processed.map((attachment) => ({
        ticketId: ticket.id,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        fileUrl: attachment.fileUrl,
        uploadedBy: email.fromName || email.from,
      })),
    });
  }

  // 이메일 스레드 매핑 저장
  await prisma.emailThreadMapping.create({
    data: {
      ticketId: ticket.id,
      messageId: email.messageId,
      inReplyTo: email.inReplyTo,
      references: email.references ? JSON.stringify(email.references) : null,
      subject: email.subject,
      fromAddress: email.from,
      toAddress: email.to,
      isProcessed: true,
      processedAt: new Date(),
      processingError,
    },
  });

  // 활동 로그 기록
  await prisma.ticketActivity.create({
    data: {
      ticketId: ticket.id,
      actorType: "CUSTOMER",
      action: "CREATED",
      newValue: "이메일 접수",
    },
  });

  return NextResponse.json({
    success: true,
    action: "ticket_created",
    ticketNumber,
    ticketId: ticket.id,
  });
}

/**
 * 이메일 본문 정제
 * - 인용문 제거
 * - 서명 제거
 * - HTML → 텍스트 변환
 */
function cleanEmailContent(content: string): string {
  let cleaned = content;

  // HTML 태그 제거 (간단한 변환)
  if (cleaned.includes("<")) {
    cleaned = cleaned
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<p>/gi, "\n")
      .replace(/<\/p>/gi, "")
      .replace(/<[^>]+>/g, "");
  }

  // 인용문 제거 (일반적인 이메일 클라이언트 패턴)
  const quotePatterns = [
    /^>.*$/gm, // > 로 시작하는 라인
    /^On.*wrote:$/m, // On [date], [name] wrote:
    /^-----Original Message-----$/m,
    /^From:.*$/m,
    /^Sent:.*$/m,
    /^To:.*$/m,
    /^Subject:.*$/m,
  ];

  for (const pattern of quotePatterns) {
    cleaned = cleaned.split(pattern)[0];
  }

  // 일반적인 서명 구분선 이후 제거
  const signaturePatterns = [
    /^--\s*$/m,
    /^—\s*$/m,
    /^Best regards,?$/mi,
    /^Thanks,?$/mi,
    /^Cheers,?$/mi,
  ];

  for (const pattern of signaturePatterns) {
    const match = cleaned.match(pattern);
    if (match && match.index) {
      cleaned = cleaned.substring(0, match.index);
    }
  }

  // 연속된 빈 줄 제거
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

/**
 * 티켓 번호 생성
 */
async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  
  const count = await prisma.ticket.count({
    where: {
      createdAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
  });

  const sequence = (count + 1).toString().padStart(6, "0");
  return `TKT-${year}-${sequence}`;
}
