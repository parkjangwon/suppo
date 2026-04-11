import { z } from "zod";

export const createChatConversationSchema = z.object({
  customerName: z.string().trim().min(1, "이름을 입력해주세요").max(100, "이름은 100자 이내로 입력해주세요"),
  customerEmail: z.string().trim().email("유효한 이메일 주소를 입력해주세요"),
  customerPhone: z.string().trim().optional(),
  initialMessage: z
    .string()
    .trim()
    .min(10, "메시지는 10자 이상 입력해주세요")
    .max(4000, "메시지는 4000자 이내로 입력해주세요"),
  widgetKey: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  captchaToken: z.string().trim().min(1, "CAPTCHA 인증이 필요합니다"),
});

export type CreateChatConversationInput = z.infer<typeof createChatConversationSchema>;
