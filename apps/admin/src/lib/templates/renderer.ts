/**
 * 템플릿 렌더링 유틸리티
 * ResponseTemplate의 플레이스홀더를 실제 값으로 치환
 */

import { Ticket, Customer, Agent, Category } from "@prisma/client";

// 템플릿 변수 인터페이스
export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
}

// 사용 가능한 기본 변수 목록
export const DEFAULT_TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: "ticket.id", description: "티켓 번호 (TKT-XXX)", example: "TKT-001" },
  { name: "ticket.subject", description: "티켓 제목", example: "로그인 오류" },
  { name: "ticket.status", description: "티켓 상태", example: "처리 중" },
  { name: "ticket.priority", description: "우선순위", example: "높음" },
  { name: "customer.name", description: "고객 이름", example: "홍길동" },
  { name: "customer.email", description: "고객 이메일", example: "hong@example.com" },
  { name: "category.name", description: "카테고리 이름", example: "기술 지원" },
  { name: "agent.name", description: "담당 상담원 이름", example: "김상담" },
];

// 렌더링 컨텍스트
export interface TemplateContext {
  ticket: Pick<Ticket, "ticketNumber" | "subject" | "status" | "priority">;
  customer: Pick<Customer, "name" | "email">;
  category: Pick<Category, "name">;
  agent: Pick<Agent, "name">;
}

/**
 * 템플릿 문자열을 렌더링하여 변수를 실제 값으로 치환
 */
export function renderTemplate(
  template: string,
  context: TemplateContext
): string {
  let rendered = template;

  // 티켓 관련 변수
  rendered = rendered.replace(/\{\{ticket\.id\}\}/g, context.ticket.ticketNumber);
  rendered = rendered.replace(/\{\{ticket\.number\}\}/g, context.ticket.ticketNumber);
  rendered = rendered.replace(/\{\{ticket\.subject\}\}/g, context.ticket.subject);
  rendered = rendered.replace(/\{\{ticket\.status\}\}/g, getStatusLabel(context.ticket.status));
  rendered = rendered.replace(/\{\{ticket\.priority\}\}/g, getPriorityLabel(context.ticket.priority));

  // 고객 관련 변수
  rendered = rendered.replace(/\{\{customer\.name\}\}/g, context.customer.name);
  rendered = rendered.replace(/\{\{customer\.email\}\}/g, context.customer.email);

  // 카테고리 관련 변수
  rendered = rendered.replace(/\{\{category\.name\}\}/g, context.category.name);

  // 상담원 관련 변수
  rendered = rendered.replace(/\{\{agent\.name\}\}/g, context.agent.name);
  rendered = rendered.replace(/\{\{agent\.email\}\}/g, ""); // 필요시 추가

  // 조걸 문 처리 (간단한 if/else)
  rendered = renderConditionals(rendered, context);

  return rendered;
}

/**
 * 상태값을 한글 라벨로 변환
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    OPEN: "접수됨",
    IN_PROGRESS: "처리 중",
    WAITING: "보류 중",
    RESOLVED: "해결됨",
    CLOSED: "종료됨",
  };
  return labels[status] || status;
}

/**
 * 우선순위를 한글 라벨로 변환
 */
function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    URGENT: "긴급",
    HIGH: "높음",
    MEDIUM: "보통",
    LOW: "낮음",
  };
  return labels[priority] || priority;
}

/**
 * 간단한 조걸 문 렌더링 (Liquid-like syntax)
 * 예: {% if ticket.priority == 'URGENT' %}긴급{% endif %}
 */
function renderConditionals(template: string, context: TemplateContext): string {
  // if 조걸 처리
  const ifPattern = /\{%\s*if\s+(.+?)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g;

  return template.replace(ifPattern, (match, condition, content) => {
    try {
      const shouldRender = evaluateCondition(condition.trim(), context);
      return shouldRender ? content.trim() : "";
    } catch {
      return match; // 오류 시 원본 유지
    }
  });
}

/**
 * 조걸 평가
 */
function evaluateCondition(condition: string, context: TemplateContext): boolean {
  // 연산자 파싱 (==, !=, contains 등)
  const operators = ["==", "!=", "contains"];
  let operator = "==";
  let parts: string[] = [];

  for (const op of operators) {
    if (condition.includes(op)) {
      operator = op;
      parts = condition.split(op).map((p) => p.trim());
      break;
    }
  }

  if (parts.length !== 2) return false;

  const [field, value] = parts;
  const fieldValue = getFieldValue(field, context);
  const compareValue = value.replace(/['"]/g, ""); // 따옴표 제거

  switch (operator) {
    case "==":
      return fieldValue === compareValue;
    case "!=":
      return fieldValue !== compareValue;
    case "contains":
      return String(fieldValue).includes(compareValue);
    default:
      return false;
  }
}

/**
 * 필드 값 추출
 */
function getFieldValue(field: string, context: TemplateContext): string {
  const parts = field.split(".");
  const [obj, prop] = parts;

  switch (obj) {
    case "ticket":
      if (prop === "id" || prop === "number") return context.ticket.ticketNumber;
      return String((context.ticket as Record<string, unknown>)[prop] ?? "");
    case "customer":
      return String((context.customer as Record<string, unknown>)[prop] ?? "");
    case "category":
      return String((context.category as Record<string, unknown>)[prop] ?? "");
    case "agent":
      return String((context.agent as Record<string, unknown>)[prop] ?? "");
    default:
      return "";
  }
}

/**
 * 템플릿에서 사용된 변수 목록 추출
 */
export function extractTemplateVariables(template: string): string[] {
  const variablePattern = /\{\{(\w+\.\w+)\}\}/g;
  const matches = template.matchAll(variablePattern);
  const variables = new Set<string>();

  for (const match of matches) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * 템플릿 미리보기 생성 (변수 하이라이트)
 */
export function createTemplatePreview(template: string): {
  preview: string;
  variables: string[];
} {
  const variables = extractTemplateVariables(template);

  // 변수를 하이라이트하여 표시
  let preview = template;
  variables.forEach((variable) => {
    const pattern = new RegExp(`\\{\\{${variable}\\}\\}`, "g");
    preview = preview.replace(pattern, `[${variable}]`);
  });

  return { preview, variables };
}
