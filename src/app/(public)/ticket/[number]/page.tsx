import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyTicketAccessToken } from "@/lib/security/ticket-access";
import { getPublicTicketThread } from "@/lib/tickets/public-thread";
import { PublicTicketDetail } from "@/components/ticket/public-ticket-detail";

interface TicketPageProps {
  params: Promise<{ number: string }>;
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { number } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("ticket_access")?.value;

  if (!token) {
    redirect("/ticket/lookup");
  }

  const access = await verifyTicketAccessToken(token);
  if (!access || access.ticketNumber !== number) {
    redirect("/ticket/lookup");
  }

  const ticket = await getPublicTicketThread(number, access.email);
  if (!ticket) {
    redirect("/ticket/lookup");
  }

  const mappedTicket = {
    id: ticket.id,
    title: ticket.subject,
    status: ticket.status,
    ticketNumber: ticket.ticketNumber,
    createdAt: ticket.createdAt,
    description: ticket.description,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attachments: ticket.attachments.map((a: any) => ({
      id: a.id,
      url: a.fileUrl,
      filename: a.fileName
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    comments: ticket.comments.map((c: any) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      isInternal: c.isInternal,
      author: c.author ? { name: c.author.name } : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attachments: c.attachments.map((a: any) => ({
        id: a.id,
        url: a.fileUrl,
        filename: a.fileName
      }))
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gitLinks: ticket.gitLinks.map((link: any) => ({
      id: link.id,
      provider: link.provider,
      repoFullName: link.repoFullName,
      issueNumber: link.issueNumber,
      issueUrl: link.issueUrl,
      createdAt: link.createdAt
    }))
  };

  return (
    <div className="py-8">
      <PublicTicketDetail ticket={mappedTicket} />
    </div>
  );
}
