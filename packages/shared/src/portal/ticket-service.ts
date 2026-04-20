import { prisma } from "@suppo/db";
import { getSystemBranding } from "@suppo/shared/db/queries/branding";

export interface PortalTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  lastCommentAt: Date | null;
}

export interface PortalTicketDetail extends PortalTicket {
  description: string;
  comments: PortalComment[];
  attachments: PortalAttachment[];
}

export interface PortalComment {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
  authorName: string;
  authorType: "CUSTOMER" | "AGENT";
}

export interface PortalAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  uploadedAt: Date;
}

export async function getPortalTickets(
  customerEmail: string,
  accountId?: string
): Promise<PortalTicket[]> {
  const tickets = await prisma.ticket.findMany({
    where: {
      OR: [
        { customerEmail },
        { customerAccountId: accountId }
      ].filter(Boolean)
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      comments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true }
      }
    }
  });
  
  return tickets.map(t => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    lastCommentAt: t.comments[0]?.createdAt ?? null
  }));
}

export async function getPortalTicketDetail(
  ticketNumber: string,
  customerEmail: string
): Promise<PortalTicketDetail | null> {
  const [ticket, branding] = await Promise.all([
    prisma.ticket.findFirst({
      where: {
        ticketNumber,
        customerEmail
      },
      include: {
        comments: {
          where: { isInternal: false },
          orderBy: { createdAt: "asc" },
          include: { agent: true }
        },
        attachments: true
      }
    }),
    getSystemBranding(),
  ]);
  
  if (!ticket) return null;

  const publicAgentDisplayName = branding.companyName?.trim() || "고객 지원팀";
  
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    description: ticket.description ?? "",
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    lastCommentAt: ticket.comments[ticket.comments.length - 1]?.createdAt ?? null,
    comments: ticket.comments.map(c => ({
      id: c.id,
      content: c.content,
      isInternal: c.isInternal,
      createdAt: c.createdAt,
      authorName: c.agentId ? publicAgentDisplayName : ticket.customerName,
      authorType: c.agentId ? "AGENT" : "CUSTOMER"
    })),
    attachments: ticket.attachments.map(a => ({
      id: a.id,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      mimeType: a.mimeType,
      uploadedAt: a.createdAt
    }))
  };
}

export async function addPortalComment(
  ticketId: string,
  customerEmail: string,
  content: string
): Promise<boolean> {
  try {
    await prisma.comment.create({
      data: {
        ticketId,
        content,
        isInternal: false,
        source: "PORTAL"
      }
    });
    return true;
  } catch {
    return false;
  }
}
