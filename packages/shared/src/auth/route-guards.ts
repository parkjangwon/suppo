import { NextResponse } from "next/server";
import type { BackofficeRole } from "@crinity/shared/auth/config";
import { hasPermission, type Permission } from "@crinity/shared/auth/permissions";

interface SessionUser {
  role?: string;
  agentId?: string;
  id?: string;
}

export function checkPermission(
  user: SessionUser,
  permission: Permission
): boolean {
  if (!user.role) return false;
  return hasPermission(user.role as BackofficeRole, permission);
}

export function requirePermission(permission: Permission) {
  return function(
    handler: (req: Request, context: { params?: Record<string, string> }) => Promise<NextResponse>
  ) {
    return async function(req: Request, context: { params?: Record<string, string> }): Promise<NextResponse> {
      // This is a placeholder - actual session check should be done via auth()
      // This wrapper pattern allows for future middleware integration
      return handler(req, context);
    };
  };
}

export function createForbiddenResponse(message = "Forbidden: Insufficient permissions"): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

export function createUnauthorizedResponse(message = "Unauthorized: Authentication required"): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}
