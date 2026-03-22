import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "ADMIN" | "TEAM_LEAD" | "AGENT" | "VIEWER";
      agentId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "TEAM_LEAD" | "AGENT" | "VIEWER";
    agentId?: string;
  }
}

export {};
