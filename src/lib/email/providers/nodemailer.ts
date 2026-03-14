export interface ProviderSendInput {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  send: (input: ProviderSendInput) => Promise<void>;
}

interface NodemailerLike {
  createTransport: (config: Record<string, unknown>) => {
    sendMail: (message: {
      from: string;
      to: string;
      subject: string;
      html: string;
    }) => Promise<unknown>;
  };
}

const dynamicImport = new Function(
  "moduleName",
  "return import(moduleName);"
) as (moduleName: string) => Promise<unknown>;

async function loadNodemailer(): Promise<NodemailerLike> {
  try {
    const imported = (await dynamicImport("nodemailer")) as {
      default?: NodemailerLike;
    } & NodemailerLike;

    return imported.default ?? imported;
  } catch (error) {
    throw new Error(`nodemailer package is not available: ${String(error)}`);
  }
}

export async function createNodemailerProvider(): Promise<EmailProvider> {
  const nodemailer = await loadNodemailer();
  const from = process.env.EMAIL_FROM ?? "no-reply@localhost";

  const hasSmtpHost = Boolean(process.env.SMTP_HOST);
  const transporter = nodemailer.createTransport(
    hasSmtpHost
      ? {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
          secure: process.env.SMTP_SECURE === "true",
          auth:
            process.env.SMTP_USER && process.env.SMTP_PASS
              ? {
                  user: process.env.SMTP_USER,
                  pass: process.env.SMTP_PASS
                }
              : undefined
        }
      : {
          jsonTransport: true
        }
  );

  return {
    async send(input) {
      await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html
      });
    }
  };
}
