import { z } from "zod";

/**
 * 입력 검증 유틸리티
 * - XSS 방어를 위한 입력 검증 및 정제
 */

// XSS 위험 문자 이스케이프
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// SQL Injection 위험 패턴 감지
const SQL_INJECTION_PATTERNS = [
  /(\bOR\b|\bAND\b)\s*["']?\w*["']?\s*=\s*["']?\w*["']?/gi,
  /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)\s+/gi,
  /--|#|\/\*|\*\//gi,
  /;\s*\w+/gi,
  /exec\s*\(/gi,
  /eval\s*\(/gi,
  /script\s*:/gi,
];

export function detectSqlInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

// Path Traversal 방어
export function sanitizePath(input: string): string {
  return input
    .replace(/\.\./g, "")
    .replace(/\//g, "")
    .replace(/\\/g, "");
}

// 이메일 형식 검증
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// URL 검증
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Zod 스키마 정의
 */

// 공통 스키마
const baseTicketSchema = {
  title: z.string().min(1, "제목은 필수입니다").max(200, "제목은 200자 이내로 작성해주세요").transform(escapeHtml),
  description: z.string().min(1, "내용은 필수입니다").max(10000, "내용은 10000자 이내로 작성해주세요").transform(escapeHtml),
  customerEmail: z.string().email("유효한 이메일 주소를 입력해주세요"),
  customerPhone: z.string().optional().refine(
    val => !val || /^\d{2,3}-\d{3,4}-\d{4}$/.test(val),
    "유효한 전화번호 형식이 아닙니다 (예: 010-1234-5678)"
  ),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  requestTypeId: z.string().optional(),
  agentId: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"]).optional(),
};

// 티켓 관련 스키마
export const createTicketSchema = z.object(baseTicketSchema);

export const updateTicketSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  title: z.string().min(1).max(200).transform(escapeHtml).optional(),
  description: z.string().min(1).max(10000).transform(escapeHtml).optional(),
});

export const lookupTicketSchema = z.object({
  ticketNumber: z.string().min(1).regex(/^[A-Za-z]{2,}-[A-Za-z0-9_-]+$/, "유효한 티켓 번호 형식이 아닙니다"),
  email: z.string().email("유효한 이메일 주소를 입력해주세요"),
});

// 댓글 관련 스키마
export const createCommentSchema = z.object({
  ticketId: z.string(),
  content: z.string().min(1, "내용은 필수입니다").max(10000, "내용은 10000자 이내로 작성해주세요").transform(escapeHtml),
  isInternal: z.boolean().optional().default(false),
  attachments: z.array(z.any()).optional(),
});

// 공개 댓글 스키마
export const createPublicCommentSchema = z.object({
  content: z.string().min(1, "내용은 필수입니다").max(10000, "내용은 10000자 이내로 작성해주세요").transform(escapeHtml),
  attachments: z.array(z.any()).optional(),
});

// 에이전트 관련 스키마
export const createAgentSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다").max(100, "이름은 100자 이내로 작성해주세요").transform(escapeHtml),
  email: z.string().email("유효한 이메일 주소를 입력해주세요"),
  teamId: z.string().optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).transform(escapeHtml).optional(),
  email: z.string().email().optional(),
  teamId: z.string().optional(),
  isActive: z.boolean().optional(),
});

// 팀 관련 스키마
export const createTeamSchema = z.object({
  name: z.string().min(1, "팀 이름은 필수입니다").max(100, "팀 이름은 100자 이내로 작성해주세요").transform(escapeHtml),
  description: z.string().max(500, "설명은 500자 이내로 작성해주세요").transform(escapeHtml).optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).transform(escapeHtml).optional(),
  description: z.string().max(500).transform(escapeHtml).optional(),
});

// 고객사 관련 스키마
export const createCustomerSchema = z.object({
  name: z.string().min(1, "고객사 이름은 필수입니다").max(200, "고객사 이름은 200자 이내로 작성해주세요").transform(escapeHtml),
  emailDomain: z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "유효한 도메인 형식이 아닙니다"),
  slaPolicyId: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).transform(escapeHtml).optional(),
  emailDomain: z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/).optional(),
  slaPolicyId: z.string().optional(),
});

// 요청 유형 스키마
export const createRequestTypeSchema = z.object({
  name: z.string().min(1, "요청 유형 이름은 필수입니다").max(100, "요청 유형 이름은 100자 이내로 작성해주세요").transform(escapeHtml),
  description: z.string().max(500, "설명은 500자 이내로 작성해주세요").transform(escapeHtml).optional(),
});

export const updateRequestTypeSchema = z.object({
  name: z.string().min(1).max(100).transform(escapeHtml).optional(),
  description: z.string().max(500).transform(escapeHtml).optional(),
});

// Git 자격 증명 스키마
export const gitCredentialsSchema = z.object({
  provider: z.enum(["GITHUB", "GITLAB"]),
  token: z.string().min(1, "토큰은 필수입니다").max(1000, "토큰은 1000자 이내로 작성해주세요"),
});

// 브랜딩 스키마
export const brandingSchema = z.object({
  companyName: z.string().min(1).max(100).transform(escapeHtml).optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "유효한 색상 코드가 아닙니다").optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().regex(/^\d{2,3}-\d{3,4}-\d{4}$/).optional(),
});

// 검증 헬퍼 함수
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new Error(firstError?.message ?? "유효하지 않은 입력입니다.");
    }
    throw error;
  }
}

// 파일 업로드 검증 스키마
export const fileUploadSchema = z.object({
  fileName: z.string().min(1).max(255).transform(sanitizePath),
  fileSize: z.number().max(10 * 1024 * 1024, "파일 크기는 10MB를 초과할 수 없습니다"),
  mimeType: z.enum([
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/zip",
  ]),
});

// 검색 스키마
export const searchSchema = z.object({
  query: z.string().min(1).max(200).transform(escapeHtml),
  filters: z.record(z.string(), z.any()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});
