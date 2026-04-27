import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export type ApiErrorCode = 
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "BAD_REQUEST";

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  requestId: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

export function createSuccessResponse<T>(data: T, requestId?: string): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    requestId: requestId || generateRequestId(),
  };
  return NextResponse.json(response);
}

export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  statusCode: number,
  details?: unknown,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
      requestId: requestId || generateRequestId(),
    },
  };
  return NextResponse.json(response, { status: statusCode });
}

export function handleZodError(error: z.ZodError, requestId?: string): NextResponse<ApiErrorResponse> {
  const details = error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

  return createErrorResponse(
    "VALIDATION_ERROR",
    "Validation failed",
    400,
    details,
    requestId
  );
}

export function handlePrismaError(error: unknown, requestId?: string): NextResponse<ApiErrorResponse> {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return createErrorResponse(
          "CONFLICT",
          "Resource already exists",
          409,
          { target: error.meta?.target },
          requestId
        );
      case "P2025":
        return createErrorResponse(
          "NOT_FOUND",
          "Resource not found",
          404,
          undefined,
          requestId
        );
      case "P2003":
        return createErrorResponse(
          "VALIDATION_ERROR",
          "Foreign key constraint failed",
          400,
          { field: error.meta?.field_name },
          requestId
        );
      default:
        return createErrorResponse(
          "INTERNAL_ERROR",
          "Database error",
          500,
          { code: error.code },
          requestId
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return createErrorResponse(
      "VALIDATION_ERROR",
      "Invalid data provided",
      400,
      undefined,
      requestId
    );
  }

  return createErrorResponse(
    "INTERNAL_ERROR",
    "An unexpected error occurred",
    500,
    undefined,
    requestId
  );
}

export function handleApiError(error: unknown, requestId?: string): NextResponse<ApiErrorResponse> {
  const id = requestId || generateRequestId();

  if (error instanceof z.ZodError) {
    return handleZodError(error, id);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError || 
      error instanceof Prisma.PrismaClientValidationError) {
    return handlePrismaError(error, id);
  }

  if (error instanceof Error) {
    console.error(`[API Error ${id}]`, error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      error.message || "An unexpected error occurred",
      500,
      undefined,
      id
    );
  }

  console.error(`[API Error ${id}] Unknown error:`, error);
  return createErrorResponse(
    "INTERNAL_ERROR",
    "An unexpected error occurred",
    500,
    undefined,
    id
  );
}

export function unauthorized(requestId?: string): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    "UNAUTHORIZED",
    "Authentication required",
    401,
    undefined,
    requestId
  );
}

export function forbidden(requestId?: string): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    "FORBIDDEN",
    "Insufficient permissions",
    403,
    undefined,
    requestId
  );
}

export function notFound(resource: string, requestId?: string): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    "NOT_FOUND",
    `${resource} not found`,
    404,
    undefined,
    requestId
  );
}

export function badRequest(message: string, details?: unknown, requestId?: string): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    "BAD_REQUEST",
    message,
    400,
    details,
    requestId
  );
}

export async function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>,
  request?: NextRequest
): Promise<NextResponse<ApiResponse<T>>> {
  const requestId = generateRequestId();
  

  try {
    const response = await handler();
    const data = await response.json();
    
    if (response.ok) {
      return createSuccessResponse(data, requestId);
    }
    
    return createErrorResponse(
      "INTERNAL_ERROR",
      data.error || "Unknown error",
      response.status,
      undefined,
      requestId
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
