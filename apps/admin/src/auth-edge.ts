import NextAuth from "next-auth";

import {
  authConfig,
  isBackofficeRole
} from "@crinity/shared/auth/config";

export const { auth } = NextAuth({
  ...authConfig,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const backofficeUser = user as Partial<{
          id: string;
          agentId: string;
          role: string;
          isInitialPassword: boolean;
          email: string;
          name: string;
        }>;

        token.sub = backofficeUser.id ?? token.sub;
        token.email = backofficeUser.email ?? token.email;
        token.name = backofficeUser.name ?? token.name;
        token.role = backofficeUser.role;
        token.agentId = backofficeUser.agentId ?? backofficeUser.id ?? token.sub;
        token.isInitialPassword = backofficeUser.isInitialPassword ?? token.isInitialPassword ?? false;
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        return session;
      }

      session.user.id = token.sub ?? "";
      session.user.email = token.email ?? "";
      session.user.name = token.name ?? "";
      session.user.role = isBackofficeRole(token.role) ? token.role : "AGENT";
      session.user.agentId = typeof token.agentId === "string" ? token.agentId : token.sub ?? "";
      (session.user as { isInitialPassword?: boolean }).isInitialPassword =
        (token.isInitialPassword as boolean | undefined) ?? false;

      return session;
    }
  }
});
