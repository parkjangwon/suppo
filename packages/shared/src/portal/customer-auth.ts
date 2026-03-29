import crypto from "crypto";

export interface CustomerAccount {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mock implementation - requires CustomerAccount model in schema
const mockAccounts: Map<string, CustomerAccount & { passwordHash: string }> = new Map();

export async function createCustomerAccount(
  email: string,
  name: string,
  password: string
): Promise<CustomerAccount> {
  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();
  
  const account: CustomerAccount & { passwordHash: string } = {
    id,
    email: email.toLowerCase(),
    name,
    emailVerified: false,
    passwordHash,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  mockAccounts.set(email.toLowerCase(), account);
  
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    emailVerified: account.emailVerified,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
}

export async function verifyCustomerCredentials(
  email: string,
  password: string
): Promise<CustomerAccount | null> {
  const account = mockAccounts.get(email.toLowerCase());
  
  if (!account) {
    return null;
  }
  
  const isValid = await verifyPassword(password, account.passwordHash);
  if (!isValid) {
    return null;
  }
  
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    emailVerified: account.emailVerified,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
}

export async function linkTicketToAccount(
  ticketNumber: string,
  accountId: string
): Promise<boolean> {
  // Requires schema update: add customerAccountId to Ticket model
  void ticketNumber;
  void accountId;
  return true;
}

async function hashPassword(password: string): Promise<string> {
  // Simple hash for demo - use bcrypt in production
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashed = crypto.createHash('sha256').update(password).digest('hex');
  return hashed === hash;
}
