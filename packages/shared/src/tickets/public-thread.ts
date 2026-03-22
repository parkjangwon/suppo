import { prisma } from "@crinity/db";

export async function getPublicTicketThread(ticketNumber: string, email: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber },
    include: {
      comments: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              name: true,
            },
          },
          attachments: true,
        },
      },
      attachments: true,
      gitLinks: {
        orderBy: { createdAt: "desc" }
      }
    },
  });

  if (!ticket || ticket.customerEmail !== email) {
    return null;
  }

  return ticket;
}
