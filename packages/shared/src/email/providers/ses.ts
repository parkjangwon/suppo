import type { EmailProvider, EmailSendInput } from "@suppo/shared/email/provider-types";

interface SesClientLike {
  send: (command: unknown) => Promise<unknown>;
}

type SesClientCtor = new (config: { region: string; credentials?: { accessKeyId: string; secretAccessKey: string } }) => SesClientLike;
type SendEmailCommandCtor = new (input: unknown) => unknown;

const dynamicImport = new Function(
  "moduleName",
  "return import(moduleName);"
) as (moduleName: string) => Promise<unknown>;

async function loadSesModule(): Promise<{ SESv2Client: SesClientCtor; SendEmailCommand: SendEmailCommandCtor }> {
  try {
    const imported = (await dynamicImport("@aws-sdk/client-sesv2")) as {
      SESv2Client: SesClientCtor;
      SendEmailCommand: SendEmailCommandCtor;
    };
    return imported;
  } catch (error) {
    throw new Error(`@aws-sdk/client-sesv2 package is not available: ${String(error)}`);
  }
}

export async function createSesProvider(): Promise<EmailProvider> {
  const region = process.env.AWS_REGION;

  if (!region) {
    throw new Error("AWS_REGION is required for SES provider");
  }

  const { SESv2Client, SendEmailCommand } = await loadSesModule();

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  const client = new SESv2Client({
    region,
    credentials:
      accessKeyId && secretAccessKey
        ? {
            accessKeyId,
            secretAccessKey
          }
        : undefined
  });

  function encodeHeaderText(value: string) {
    return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
  }

  function toRawEmail(input: EmailSendInput) {
    const headers = Object.entries(input.headers ?? {}).map(([key, value]) => `${key}: ${value}`);
    const raw = [
      `From: ${input.from}`,
      `To: ${input.to}`,
      `Subject: ${encodeHeaderText(input.subject)}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      ...headers,
      "",
      input.html,
    ].join("\r\n");

    return Buffer.from(raw, "utf8");
  }

  return {
    async send(input: EmailSendInput) {
      await client.send(
        new SendEmailCommand({
          Content: {
            Raw: {
              Data: toRawEmail(input),
            }
          },
        })
      );
    }
  };
}
