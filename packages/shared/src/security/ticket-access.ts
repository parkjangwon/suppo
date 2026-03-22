import { sign, verify } from "jsonwebtoken";

if (!process.env.TICKET_ACCESS_SECRET) {
  throw new Error(
    "TICKET_ACCESS_SECRET environment variable is required. " +
    "Please set a strong secret (min 32 characters) in your .env file."
  );
}

const TICKET_ACCESS_SECRET = process.env.TICKET_ACCESS_SECRET;

export async function issueTicketAccessCookie(
  ticketNumber: string,
  email: string
): Promise<string> {
  return sign({ ticketNumber, email }, TICKET_ACCESS_SECRET, { expiresIn: "24h" });
}

export async function verifyTicketAccessToken(token: string): Promise<{ ticketNumber: string; email: string } | null> {
  try {
    return verify(token, TICKET_ACCESS_SECRET) as { ticketNumber: string; email: string };
  } catch {
    return null;
  }
}
