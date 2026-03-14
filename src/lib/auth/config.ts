import type { NextAuthConfig } from "next-auth";
import type { Session } from "next-auth";

export const BACKOFFICE_LOGIN_PATH = "/admin/login";
export const BACKOFFICE_DASHBOARD_PATH = "/admin/dashboard";

export type BackofficeRole = "ADMIN" | "AGENT";

export interface BackofficeSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: BackofficeRole;
    agentId: string;
  };
}

export function isBackofficeRole(value: unknown): value is BackofficeRole {
  return value === "ADMIN" || value === "AGENT";
}

export const authConfig = {
  providers: [],
  secret: process.env.AUTH_SECRET ?? "local-auth-secret-for-development",
  pages: {
    signIn: BACKOFFICE_LOGIN_PATH
  },
  session: {
    strategy: "jwt"
  }
} satisfies NextAuthConfig;

export function toBackofficeSession(session: Session | null): BackofficeSession | null {
  if (!session?.user) {
    return null;
  }

  const user = session.user as Session["user"] & {
    id?: string;
    role?: unknown;
    agentId?: string;
  };

  if (!user.id || !user.email || !user.name || !user.agentId || !isBackofficeRole(user.role)) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      agentId: user.agentId
    }
  };
}
