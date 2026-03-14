import { BACKOFFICE_LOGIN_PATH, type BackofficeSession } from "@/lib/auth/config";

export interface GuardResult {
  allowed: boolean;
  redirect?: string;
  error?: string;
}

export async function requireBackofficeSession(
  session: BackofficeSession | null | undefined
): Promise<GuardResult> {
  if (!session) {
    return {
      allowed: false,
      redirect: BACKOFFICE_LOGIN_PATH,
      error: "인증이 필요합니다"
    };
  }

  return { allowed: true };
}

export function requireAssignedOrAdmin(
  session: BackofficeSession,
  assigneeId: string | null | undefined
): GuardResult {
  if (session.user.role === "ADMIN") {
    return { allowed: true };
  }

  if (!assigneeId || session.user.agentId !== assigneeId) {
    return {
      allowed: false,
      error: "담당자 또는 관리자 권한이 필요합니다"
    };
  }

  return { allowed: true };
}

export function requireAdmin(session: BackofficeSession): GuardResult {
  if (session.user.role === "ADMIN") {
    return { allowed: true };
  }

  return {
    allowed: false,
    error: "관리자 권한이 필요합니다"
  };
}

export type { BackofficeSession } from "@/lib/auth/config";
