export interface ProviderSendInput {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  send: (input: ProviderSendInput) => Promise<void>;
}

export function createResendProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? process.env.EMAIL_FROM;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required for Resend provider");
  }

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL or EMAIL_FROM is required for Resend provider");
  }

  return {
    async send(input) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          html: input.html
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Resend send failed (${response.status}): ${text}`);
      }
    }
  };
}
