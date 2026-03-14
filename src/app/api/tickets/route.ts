import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { verifyCaptcha } from "@/lib/security/captcha";
import { ticketFormSchema } from "@/lib/validation/ticket";
import { processAttachments, AttachmentError } from "@/lib/storage/attachment-service";
import { createTicket } from "@/lib/db/queries/tickets";

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
      categoryId: formData.get("categoryId") as string,
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
    
    // Generate a temporary ticket ID for storage
    const tempTicketId = `temp-${Date.now()}`;
    
    let processedAttachments = [];
    try {
      processedAttachments = await processAttachments(files, tempTicketId);
    } catch (error) {
      if (error instanceof AttachmentError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    const ticket = await createTicket({
      customerName: validationResult.data.customerName,
      customerEmail: validationResult.data.customerEmail,
      customerPhone: validationResult.data.customerPhone,
      categoryId: validationResult.data.categoryId,
      priority: validationResult.data.priority as "URGENT" | "HIGH" | "MEDIUM" | "LOW",
      subject: validationResult.data.subject,
      description: validationResult.data.description,
      attachments: processedAttachments,
    });

    return NextResponse.json({ ticketNumber: ticket.ticketNumber }, { status: 201 });
  } catch (error) {
    console.error("Failed to create ticket:", error);
    return NextResponse.json(
      { error: "티켓 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
