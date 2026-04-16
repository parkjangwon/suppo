import type { EmailProvider, EmailSendInput } from "@crinity/shared/email/provider-types";

export function createResendProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required for Resend provider");
  }

  return {
    async send(input: EmailSendInput) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: input.from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          headers: input.headers,
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Resend send failed (${response.status}): ${text}`);
      }
    }
  };
}
