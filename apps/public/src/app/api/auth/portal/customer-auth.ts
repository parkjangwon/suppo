import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";

// Customer Portal Authentication
export const {
  handlers: customerHandlers,
  auth: customerAuth,
  signIn: customerSignIn,
  signOut: customerSignOut
} = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Customer Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        
        if (!email || !password) return null;
        
        // Verify customer credentials against stored hash
        const account = await getCustomerAccount(email);
        if (!account) return null;
        
        const isValid = await compare(password, account.passwordHash);
        if (!isValid) return null;
        
        return {
          id: account.id,
          email: account.email,
          name: account.name,
          type: "CUSTOMER"
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.type = (user as { type?: string }).type;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { type?: string }).type = token.type as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/portal/login",
    error: "/portal/login"
  }
});

// Customer account storage (would be DB in production)
const customerAccounts: Map<string, { 
  id: string; 
  email: string; 
  name: string; 
  passwordHash: string;
  createdAt: Date;
}> = new Map();

export async function registerCustomer(
  email: string, 
  name: string, 
  password: string
): Promise<{ success: boolean; error?: string }> {
  const existing = await getCustomerAccount(email);
  if (existing) {
    return { success: false, error: "Email already registered" };
  }
  
  const passwordHash = await hash(password, 10);
  const id = `cust_${Date.now()}`;
  
  customerAccounts.set(email.toLowerCase(), {
    id,
    email: email.toLowerCase(),
    name,
    passwordHash,
    createdAt: new Date()
  });
  
  return { success: true };
}

export async function getCustomerAccount(email: string) {
  return customerAccounts.get(email.toLowerCase()) || null;
}

export async function linkTicketToCustomer(
  ticketNumber: string,
  customerEmail: string
): Promise<boolean> {
  // Store ticket-customer association
  ticketCustomerMap.set(ticketNumber, customerEmail.toLowerCase());
  return true;
}

const ticketCustomerMap: Map<string, string> = new Map();

export function getTicketCustomer(ticketNumber: string): string | null {
  return ticketCustomerMap.get(ticketNumber) || null;
}
