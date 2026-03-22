import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@crinity/shared/security/rate-limit";
import { ticketFormSchema } from "@crinity/shared/validation/ticket";
import { processAttachments, AttachmentError } from "@crinity/shared/storage/attachment-service";
import { createTicket } from "@crinity/shared/tickets/create-ticket";
import { classifyTicket } from "@crinity/shared/ai/classifier";
import { prisma } from "@crinity/db";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    
    if (!checkRateLimit(ip, 5, 60 * 1000)) {
      return NextResponse.json(
        { error: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const formData = await request.formData();

    const data = {
      customerName: formData.get("customerName") as string,
      customerEmail: formData.get("customerEmail") as string,
      customerPhone: (formData.get("customerPhone") as string) || undefined,
      customerOrganization: (formData.get("customerOrganization") as string) || undefined,
      requestTypeId: formData.get("requestTypeId") as string,
      priority: formData.get("priority") as string,
      subject: formData.get("subject") as string,
      description: formData.get("description") as string,
    };

    const validationResult = ticketFormSchema.safeParse(data);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const files = formData.getAll("attachments") as File[];

    const result = await createTicket({
      customerName: validationResult.data.customerName,
      customerEmail: validationResult.data.customerEmail,
      customerPhone: validationResult.data.customerPhone,
      customerOrganization: validationResult.data.customerOrganization,
      requestTypeId: validationResult.data.requestTypeId,
      priority: validationResult.data.priority as "URGENT" | "HIGH" | "MEDIUM" | "LOW",
      subject: validationResult.data.subject,
      description: validationResult.data.description,
    });

    try {
      const [availableCategories, availableTeams] = await Promise.all([
        prisma.category.findMany(),
        prisma.team.findMany({ where: { isActive: true } }),
      ]);

      const classification = await classifyTicket(
        validationResult.data.subject,
        validationResult.data.description,
        availableCategories,
        availableTeams
      );

      if (classification) {
        const tags = [
          "ai:auto-classified",
          ...(classification.teamId ? [`team:${classification.teamId}`] : []),
          ...(classification.categoryId ? [`category:${classification.categoryId}`] : []),
        ];

        await prisma.ticket.update({
          where: { id: result.ticket.id },
          data: {
            priority: classification.priority,
            teamId: classification.teamId ?? undefined,
            categoryId: classification.categoryId ?? undefined,
            tags: JSON.stringify(tags),
          },
        });
      }
    } catch (classificationError) {
      console.error("Failed to auto-classify ticket:", classificationError);
    }

    if (files.length > 0) {
      try {
        const processedAttachments = await processAttachments(files, result.ticket.id);

        if (processedAttachments.length > 0) {
          await prisma.attachment.createMany({
            data: processedAttachments.map(a => ({
              ticketId: result.ticket.id,
              fileName: a.fileName,
              fileSize: a.fileSize,
              mimeType: a.mimeType,
              fileUrl: a.fileUrl,
              uploadedBy: validationResult.data.customerName,
            })),
          });
        }
      } catch (error) {
        if (error instanceof AttachmentError) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        throw error;
      }
    }

    return NextResponse.json({ ticketNumber: result.ticket.ticketNumber }, { status: 201 });
  } catch (error) {
    console.error("Failed to create ticket:", error);
    return NextResponse.json(
      { error: "티켓 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
