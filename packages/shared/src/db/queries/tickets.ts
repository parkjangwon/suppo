import { prisma } from "@suppo/db";

export async function createTicket(data: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  categoryId: string;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  subject: string;
  description: string;
  attachments: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileUrl: string;
  }[];
}) {
  const date = new Date();
  const dateString = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const ticketNumber = `CRN-${dateString}-${randomStr}`;

  return prisma.ticket.create({
    data: {
      ticketNumber,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      categoryId: data.categoryId,
      priority: data.priority,
      subject: data.subject,
      description: data.description,
      status: "OPEN",
      attachments: {
        create: data.attachments.map(a => ({
          fileName: a.fileName,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
          fileUrl: a.fileUrl,
          uploadedBy: data.customerName,
        })),
      },
    },
  });
}
