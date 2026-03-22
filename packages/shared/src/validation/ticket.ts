import { z } from "zod";

export const ticketFormSchema = z.object({
  customerName: z.string().min(1, "이름을 입력해주세요"),
  customerEmail: z.string().email("유효한 이메일 주소를 입력해주세요"),
  customerPhone: z.string().optional(),
  customerOrganization: z.string().optional(),
  requestTypeId: z.string().min(1, "문의 유형을 선택해주세요"),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"], {
    message: "우선순위를 선택해주세요",
  }),
  subject: z.string().min(5, "제목은 5자 이상이어야 합니다"),
  description: z.string().min(20, "내용은 20자 이상이어야 합니다"),
});

export type TicketFormValues = z.infer<typeof ticketFormSchema>;
