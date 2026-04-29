import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSystemBranding } from "@suppo/shared/db/queries/branding";
import { verifyTicketAccessToken } from "@suppo/shared/security/ticket-access";
import { getPublicTicketThread } from "@suppo/shared/tickets/public-thread";
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

  const [ticket, branding] = await Promise.all([
    getPublicTicketThread(number, access.email),
    getSystemBranding(),
  ]);
  if (!ticket) {
    redirect("/ticket/lookup");
  }

  const publicAgentDisplayName = branding.companyName?.trim() || "고객 지원팀";

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
      url: `/api/attachments/${a.id}`,
      filename: a.fileName
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    comments: ticket.comments.map((c: any) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      isInternal: c.isInternal,
      author: c.author ? { name: publicAgentDisplayName } : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attachments: c.attachments.map((a: any) => ({
        id: a.id,
        url: `/api/attachments/${a.id}`,
        filename: a.fileName,
        mimeType: a.mimeType
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
      <PublicTicketDetail
        ticket={mappedTicket}
        agentDisplayName={publicAgentDisplayName}
      />
    </div>
  );
}
