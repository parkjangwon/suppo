import crypto from "crypto";

/**
 * 고유한 Message-ID 생성
 * RFC 5322 compliant
 */
export function generateMessageId(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");
  const hostname = process.env.EMAIL_DOMAIN || "crinity.io";
  return `<${timestamp}.${random}@${hostname}>`;
}

/**
 * 이메일 스레드를 위한 헤더 생성
 */
export interface ThreadHeaders {
  messageId: string;
  inReplyTo?: string;
  references?: string[];
}

/**
 * 부모 이메일 정보를 바탕으로 스레드 헤더 생성
 */
export function createThreadHeaders(
  parentMessageId?: string,
  existingReferences?: string[]
): ThreadHeaders {
  const messageId = generateMessageId();

  if (!parentMessageId) {
    // 새 스레드 시작
    return { messageId };
  }

  // 기존 스레드 참조
  const references = existingReferences
    ? [...existingReferences, parentMessageId]
    : [parentMessageId];

  // RFC 권고: 최대 10개 참조 유지
  const trimmedReferences =
    references.length > 10
      ? [references[0], ...references.slice(-9)]
      : references;

  return {
    messageId,
    inReplyTo: parentMessageId,
    references: trimmedReferences,
  };
}

/**
 * 헤더를 문자열 형태로 변환 (이메일 발송용)
 */
export function formatThreadHeaders(headers: ThreadHeaders): Record<string, string> {
  const result: Record<string, string> = {
    "Message-ID": headers.messageId,
  };

  if (headers.inReplyTo) {
    result["In-Reply-To"] = headers.inReplyTo;
  }

  if (headers.references && headers.references.length > 0) {
    result["References"] = headers.references.join(" ");
  }

  return result;
}

/**
 * 이메일 헤더에서 Message-ID 추출
 */
export function extractMessageId(headerValue: string): string | null {
  const match = headerValue.match(/<([^>]+)>/);
  return match ? match[0] : null;
}

/**
 * References 헤더 파싱
 */
export function parseReferences(referencesHeader: string): string[] {
  if (!referencesHeader) return [];
  return referencesHeader.match(/<[^>]+>/g) || [];
}
