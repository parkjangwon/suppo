export interface ProviderSendInput {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  send: (input: ProviderSendInput) => Promise<void>;
}

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
  const from = process.env.SES_FROM_EMAIL ?? process.env.EMAIL_FROM;

  if (!region) {
    throw new Error("AWS_REGION is required for SES provider");
  }

  if (!from) {
    throw new Error("SES_FROM_EMAIL or EMAIL_FROM is required for SES provider");
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

  return {
    async send(input) {
      await client.send(
        new SendEmailCommand({
          FromEmailAddress: from,
          Destination: {
            ToAddresses: [input.to]
          },
          Content: {
            Simple: {
              Subject: {
                Data: input.subject,
                Charset: "UTF-8"
              },
              Body: {
                Html: {
                  Data: input.html,
                  Charset: "UTF-8"
                }
              }
            }
          }
        })
      );
    }
  };
}
