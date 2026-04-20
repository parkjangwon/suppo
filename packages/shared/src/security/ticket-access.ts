import { sign, verify } from "jsonwebtoken";

function getTicketAccessSecret(): string {
  const secret = process.env.TICKET_ACCESS_SECRET;

  if (!secret) {
    throw new Error(
      "TICKET_ACCESS_SECRET environment variable is required. " +
        "Please set a strong secret (min 32 characters) in your .env file."
    );
  }

  return secret;
}

export async function issueTicketAccessCookie(
  ticketNumber: string,
  email: string
): Promise<string> {
  return sign({ ticketNumber, email }, getTicketAccessSecret(), { expiresIn: "24h" });
}

export async function verifyTicketAccessToken(
  token: string
): Promise<{ ticketNumber: string; email: string } | null> {
  try {
    return verify(token, getTicketAccessSecret()) as { ticketNumber: string; email: string };
  } catch {
    return null;
  }
}
