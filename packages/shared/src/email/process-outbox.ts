import { prisma } from "@crinity/db";
import { createLoggerProvider } from "@crinity/shared/email/providers/logger";
import { createNodemailerProvider } from "@crinity/shared/email/providers/nodemailer";
import { createResendProvider } from "@crinity/shared/email/providers/resend";
import { createSesProvider } from "@crinity/shared/email/providers/ses";
import type { EmailProvider } from "@crinity/shared/email/provider-types";
import {
  formatEmailFrom,
  getDefaultEmailSettings,
} from "@crinity/shared/email/settings";

type EmailDeliveryStatus = "PENDING" | "SENT" | "FAILED";
type EmailDeliveryCategory = "CUSTOMER" | "INTERNAL";

interface EmailDeliveryRecord {
  id: string;
  to: string;
  subject: string;
  body: string;
  category: EmailDeliveryCategory;
  ticketId: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  references: string | null;
  status: EmailDeliveryStatus;
  attemptCount: number;
  nextRetryAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EmailOutboxDbClient {
  emailDelivery: {
    findMany: (args: {
      where: {
        status: "PENDING";
        id?: { in: string[] };
        OR: Array<{ nextRetryAt: null } | { nextRetryAt: { lte: Date } }>;
      };
      orderBy: { createdAt: "asc" };
      take: number;
    }) => Promise<EmailDeliveryRecord[]>;
    update: (args: {
      where: { id: string };
      data: {
        status: EmailDeliveryStatus;
        attemptCount: number;
        nextRetryAt: Date | null;
        lastError: string | null;
      };
    }) => Promise<EmailDeliveryRecord>;
  };
}

export interface ProcessOutboxInput {
  db?: EmailOutboxDbClient;
  provider?: EmailProvider;
  now?: Date;
  limit?: number;
  deliveryIds?: string[];
  ignoreMasterToggles?: boolean;
}

export interface ProcessOutboxResult {
  sent: number;
  retried: number;
  failed: number;
  processed: number;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [60_000, 120_000, 240_000] as const;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getNextRetryAt(now: Date, nextAttemptCount: number): Date | null {
  const retryIndex = nextAttemptCount - 1;
  const retryDelay = RETRY_DELAYS_MS[retryIndex];

  if (retryDelay === undefined) {
    return null;
  }

  return new Date(now.getTime() + retryDelay);
}

async function getEmailSettings() {
  const settings = await prisma.emailSettings.findUnique({
    where: { id: "default" },
  });

  return {
    ...getDefaultEmailSettings(),
    ...settings,
  };
}

async function createConfiguredProvider(): Promise<EmailProvider> {
  const settings = await getEmailSettings();

  if (settings.testMode) {
    return createLoggerProvider();
  }

  const provider = settings.provider.toLowerCase();

  if (provider === "ses") {
    process.env.AWS_ACCESS_KEY_ID = settings.sesAccessKey || "";
    process.env.AWS_SECRET_ACCESS_KEY = settings.sesSecretKey || "";
    process.env.AWS_REGION = settings.sesRegion;
    return createSesProvider();
  }

  if (provider === "resend") {
    process.env.RESEND_API_KEY = settings.resendApiKey || "";
    return createResendProvider();
  }

  process.env.SMTP_HOST = settings.smtpHost || "";
  process.env.SMTP_PORT = String(settings.smtpPort);
  process.env.SMTP_SECURE = String(settings.smtpSecure);
  process.env.SMTP_USER = settings.smtpUser || "";
  process.env.SMTP_PASS = settings.smtpPassword || "";
  return createNodemailerProvider();
}

function isDeliveryEnabled(
  category: EmailDeliveryCategory,
  settings: Awaited<ReturnType<typeof getEmailSettings>>,
) {
  if (category === "CUSTOMER") {
    return settings.customerEmailsEnabled;
  }

  return settings.internalNotificationsEnabled;
}

async function updateThreadMappingAfterSend(record: EmailDeliveryRecord) {
  if (!record.ticketId || !record.messageId) {
    return;
  }

  await prisma.emailThreadMapping.updateMany({
    where: { messageId: record.messageId },
    data: {
      isProcessed: true,
      processedAt: new Date(),
      processingError: null,
    },
  });
}

async function updateThreadMappingAfterFailure(
  record: EmailDeliveryRecord,
  errorMessage: string,
) {
  if (!record.messageId) {
    return;
  }

  await prisma.emailThreadMapping.updateMany({
    where: { messageId: record.messageId },
    data: {
      processingError: errorMessage,
    },
  });
}

function parseStoredReferences(references: string | null): string[] | undefined {
  if (!references) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(references) as unknown;
    if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")) {
      return parsed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function processOutbox(input: ProcessOutboxInput = {}): Promise<ProcessOutboxResult> {
  const db = input.db ?? prisma;
  const settings = await getEmailSettings();

  const provider = input.provider ?? (await createConfiguredProvider());

  const now = input.now ?? new Date();
  const limit = input.limit ?? 25;

  const records = await db.emailDelivery.findMany({
    where: {
      status: "PENDING",
      ...(input.deliveryIds && input.deliveryIds.length > 0
        ? { id: { in: input.deliveryIds } }
        : {}),
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let retried = 0;
  let failed = 0;

  for (const record of records) {
    const nextAttemptCount = record.attemptCount + 1;

    if (!input.ignoreMasterToggles && !isDeliveryEnabled(record.category, settings)) {
      continue;
    }

    try {
      await provider.send({
        to: record.to,
        subject: record.subject,
        html: record.body,
        from: formatEmailFrom(settings.fromEmail, settings.fromName),
        headers: record.messageId
          ? {
              "Message-ID": record.messageId,
              ...(record.inReplyTo ? { "In-Reply-To": record.inReplyTo } : {}),
              ...(parseStoredReferences(record.references)
                ? { References: parseStoredReferences(record.references)!.join(" ") }
                : {}),
            }
          : undefined,
      });

      await db.emailDelivery.update({
        where: { id: record.id },
        data: {
          status: "SENT",
          attemptCount: nextAttemptCount,
          nextRetryAt: null,
          lastError: null,
        },
      });

      await updateThreadMappingAfterSend(record);
      sent += 1;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      await updateThreadMappingAfterFailure(record, errorMessage);

      if (nextAttemptCount >= MAX_RETRY_ATTEMPTS) {
        await db.emailDelivery.update({
          where: { id: record.id },
          data: {
            status: "FAILED",
            attemptCount: nextAttemptCount,
            nextRetryAt: null,
            lastError: errorMessage,
          },
        });

        failed += 1;
      } else {
        await db.emailDelivery.update({
          where: { id: record.id },
          data: {
            status: "PENDING",
            attemptCount: nextAttemptCount,
            nextRetryAt: getNextRetryAt(now, nextAttemptCount),
            lastError: errorMessage,
          },
        });

        retried += 1;
      }
    }
  }

  return {
    sent,
    retried,
    failed,
    processed: records.length,
  };
}
