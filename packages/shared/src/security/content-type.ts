import { NextRequest, NextResponse } from "next/server";

/**
 * 콘텐츠 타입 검증
 * - JSON API 요청에 대한 콘텐츠 타입 검증
 * - MIME 스니핑 방지
 */

const ALLOWED_CONTENT_TYPES = [
  "application/json",
  "application/json; charset=utf-8",
  "multipart/form-data",
  "application/x-www-form-urlencoded",
];

export class ContentTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentTypeError";
  }
}

/**
 * 요청의 콘텐츠 타입 검증
 */
export function validateContentType(request: NextRequest, allowedTypes?: string[]): boolean {
  const contentType = request.headers.get("content-type");
  const types = allowedTypes || ALLOWED_CONTENT_TYPES;

  // GET, HEAD, DELETE 등 본문이 없는 요청은 통과
  const method = request.method;
  if (["GET", "HEAD", "DELETE", "OPTIONS"].includes(method)) {
    return true;
  }

  // 본문이 있는 요청은 콘텐츠 타입 필수
  if (!contentType) {
    return false;
  }

  // 콘텐츠 타입 검증
  const normalizedType = contentType.toLowerCase().trim();
  return types.some(
    allowed => normalizedType.includes(allowed.toLowerCase())
  );
}

/**
 * JSON 요청만 허용하는 래퍼
 */
export function requireJson(request: NextRequest): NextResponse | null {
  if (!validateContentType(request, ["application/json"])) {
    return NextResponse.json(
      { error: "Invalid content type. Expected application/json" },
      { status: 415 }
    );
  }
  return null;
}

/**
 * JSON 본문 파싱 및 검증
 */
export async function parseJsonBody<T = unknown>(request: NextRequest): Promise<T> {
  // 콘텐츠 타입 검증
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    throw new ContentTypeError("Invalid content type. Expected application/json");
  }

  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ContentTypeError("Invalid JSON format");
    }
    throw error;
  }
}

/**
 * API 경로 래퍼 - 콘텐츠 타입 검증 자동 수행
 */
export function withContentTypeValidation<T extends (
  request: NextRequest,
  ...args: any[]
) => Promise<NextResponse>>(
  handler: T,
  allowedTypes?: string[]
): T {
  return (async (request: NextRequest, ...args: any[]) => {
    if (!validateContentType(request, allowedTypes)) {
      return NextResponse.json(
        { error: "Unsupported Media Type" },
        { status: 415 }
      );
    }

    return handler(request, ...args);
  }) as T;
}

/**
 * 요청 본문 크기 제한
 */
export function validateBodySize(request: NextRequest, maxSize: number = 1024 * 1024): boolean {
  const contentLength = request.headers.get("content-length");

  if (!contentLength) {
    // Content-Length 헤더가 없으면 청크 전송 가능
    return true;
  }

  const size = parseInt(contentLength, 10);
  return !isNaN(size) && size <= maxSize;
}
