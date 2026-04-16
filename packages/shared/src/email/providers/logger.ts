import type { EmailProvider, EmailSendInput } from "@crinity/shared/email/provider-types";

export function createLoggerProvider(): EmailProvider {
  return {
    async send(input: EmailSendInput) {
      console.log("[Email Test Mode] Outbound email", {
        to: input.to,
        from: input.from,
        subject: input.subject,
        headers: input.headers ?? {},
        html: input.html,
      });
    },
  };
}
