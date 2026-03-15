import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { verifyCaptcha } from "@/lib/security/captcha";
import { ticketFormSchema } from "@/lib/validation/ticket";
import { processAttachments, AttachmentError } from "@/lib/storage/attachment-service";
import { createTicket } from "@/lib/tickets/create-ticket";
import { getAdminTickets } from "@/lib/db/queries/admin-tickets";
import { auth } from "@/auth";
import { TicketStatus, TicketPriority } from "@prisma/client";
import { prisma } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get("status") as TicketStatus | undefined;
    const priority = searchParams.get("priority") as TicketPriority | undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const assigneeId = searchParams.get("assigneeId") || undefined;
    const search = searchParams.get("search") || undefined;
    const cursor = searchParams.get("cursor") || undefined;

    const result = await getAdminTickets({
      status,
      priority,
      categoryId,
      assigneeId,
      search,
      cursor,
      agentId: session.user.agentId,
      agentRole: session.user.role as "ADMIN" | "AGENT",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch tickets:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "티켓 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

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
      captchaToken: formData.get("captchaToken") as string,
    };

    const validationResult = ticketFormSchema.safeParse(data);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const isValidCaptcha = await verifyCaptcha(validationResult.data.captchaToken);
    
    if (!isValidCaptcha) {
      return NextResponse.json(
        { error: "CAPTCHA 검증에 실패했습니다." },
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


