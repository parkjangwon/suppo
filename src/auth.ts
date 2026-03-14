import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare, hash, hashSync } from "bcryptjs";
import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import {
  authConfig,
  isBackofficeRole,
  type BackofficeRole
} from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";

const DEFAULT_ADMIN_EMAIL = "admin@crinity.io";
const DEFAULT_ADMIN_PASSWORD = "admin123";
const DEFAULT_ADMIN_PASSWORD_HASH = hashSync(DEFAULT_ADMIN_PASSWORD, 10);
const HAS_DATABASE = Boolean(process.env.DATABASE_URL);

type AuthenticatedAgent = {
  id: string;
  email: string;
  name: string;
  role: BackofficeRole;
  agentId: string;
};

async function ensureDefaultAdminSeed() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const existingAdmin = await prisma.agent.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL }
  });
  const passwordHash = await hash(DEFAULT_ADMIN_PASSWORD, 10);

  if (!existingAdmin) {
    await prisma.agent.create({
      data: {
        email: DEFAULT_ADMIN_EMAIL,
        name: "관리자",
        role: "ADMIN",
        authProvider: "CREDENTIALS",
        isActive: true,
        maxTickets: 50,
        passwordHash
      }
    });
    return;
  }

  if (!existingAdmin.passwordHash || !existingAdmin.passwordHash.startsWith("$2")) {
    await prisma.agent.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash,
        authProvider: "CREDENTIALS"
      }
    });
  }
}

function toAuthenticatedAgent(agent: {
  id: string;
  email: string;
  name: string;
  role: BackofficeRole;
}): AuthenticatedAgent {
  return {
    id: agent.id,
    agentId: agent.id,
    email: agent.email,
    name: agent.name,
    role: agent.role
  };
}

async function authorizeFallbackAdmin(email: string, password: string): Promise<AuthenticatedAgent | null> {
  if (process.env.NODE_ENV === "production" || email !== DEFAULT_ADMIN_EMAIL) {
    return null;
  }

  const isValidPassword = await compare(password, DEFAULT_ADMIN_PASSWORD_HASH);
  if (!isValidPassword) {
    return null;
  }

  return {
    id: "mock-admin",
    agentId: "mock-admin",
    email: DEFAULT_ADMIN_EMAIL,
    name: "관리자",
    role: "ADMIN"
  };
}

const providers: Provider[] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
      const password = typeof credentials?.password === "string" ? credentials.password : "";

      if (!email || !password) {
        return null;
      }

      if (!HAS_DATABASE) {
        return authorizeFallbackAdmin(email, password);
      }

      try {
        await ensureDefaultAdminSeed();

        const agent = await prisma.agent.findUnique({
          where: { email }
        });

        if (!agent || !agent.passwordHash || !agent.isActive) {
          return null;
        }

        const isValidPassword = await compare(password, agent.passwordHash);

        if (!isValidPassword || !isBackofficeRole(agent.role)) {
          return null;
        }

        return toAuthenticatedAgent(agent);
      } catch {
        return authorizeFallbackAdmin(email, password);
      }
    }
  })
];

let hasOAuthProviders = false;

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  hasOAuthProviders = true;
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET
    })
  );
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  hasOAuthProviders = true;
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  ...(hasOAuthProviders && HAS_DATABASE ? { adapter: PrismaAdapter(prisma) as Adapter } : {}),
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || !account) {
        return true;
      }

      if (account.provider !== "google" && account.provider !== "github") {
        return true;
      }

      if (!HAS_DATABASE) {
        return false;
      }

      const mappedProvider = account.provider === "google" ? "GOOGLE" : "GITHUB";
      const agent = await prisma.agent.upsert({
        where: { email: user.email.toLowerCase() },
        update: {
          name: user.name ?? user.email,
          authProvider: mappedProvider,
          isActive: true
        },
        create: {
          email: user.email.toLowerCase(),
          name: user.name ?? user.email,
          role: "AGENT",
          isActive: true,
          maxTickets: 10,
          authProvider: mappedProvider
        }
      });

      (user as AuthenticatedAgent).id = agent.id;
      (user as AuthenticatedAgent).agentId = agent.id;
      (user as AuthenticatedAgent).role = agent.role;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const backofficeUser = user as Partial<AuthenticatedAgent>;
        token.sub = backofficeUser.id ?? token.sub;
        token.email = backofficeUser.email ?? token.email;
        token.name = backofficeUser.name ?? token.name;
        token.role = backofficeUser.role;
        token.agentId = backofficeUser.agentId ?? backofficeUser.id ?? token.sub;
      }

      if (HAS_DATABASE && (!token.role || !token.agentId) && token.sub) {
        const agent = await prisma.agent.findUnique({
          where: { id: token.sub },
          select: {
            role: true,
            id: true
          }
        });

        if (agent && isBackofficeRole(agent.role)) {
          token.role = agent.role;
          token.agentId = agent.id;
        }
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

      return session;
    }
  }
});
