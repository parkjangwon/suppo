import { sign, verify } from "jsonwebtoken";

const TICKET_ACCESS_SECRET = process.env.TICKET_ACCESS_SECRET || "fallback-secret-for-dev";

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
