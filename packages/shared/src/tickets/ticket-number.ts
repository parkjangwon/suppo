import { nanoid } from "nanoid";

import { prisma } from "@crinity/db";

const MAX_GENERATION_ATTEMPTS = 5;

export async function generateTicketNumber(): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const ticketNumber = `CRN-${nanoid(10)}`;
    const existing = await prisma.ticket.findUnique({
      where: { ticketNumber },
      select: { id: true }
    });

    if (!existing) {
      return ticketNumber;
    }
  }

  throw new Error("Failed to generate a unique ticket number");
}
