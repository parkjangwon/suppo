import { prisma } from "@/lib/db/client";
import { createNodemailerProvider } from "@/lib/email/providers/nodemailer";
import { createResendProvider } from "@/lib/email/providers/resend";
import { createSesProvider } from "@/lib/email/providers/ses";

type EmailDeliveryStatus = "PENDING" | "SENT" | "FAILED";

export interface EmailProvider {
  send: (input: { to: string; subject: string; html: string }) => Promise<void>;
}

interface EmailDeliveryRecord {
  id: string;
  to: string;
  subject: string;
  body: string;
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

async function createConfiguredProvider(): Promise<EmailProvider> {
  const configuredProvider = process.env.EMAIL_PROVIDER?.toLowerCase();

  if (configuredProvider === "ses") {
    return createSesProvider();
  }

  if (configuredProvider === "resend") {
    return createResendProvider();
  }

  if (configuredProvider === "nodemailer") {
    return createNodemailerProvider();
  }

  if (process.env.NODE_ENV === "production") {
    return createResendProvider();
  }

  return createNodemailerProvider();
}

export async function processOutbox(input: ProcessOutboxInput = {}): Promise<ProcessOutboxResult> {
  const db = input.db ?? prisma;
  const provider = input.provider ?? (await createConfiguredProvider());
  const now = input.now ?? new Date();
  const limit = input.limit ?? 25;

  const records = await db.emailDelivery.findMany({
    where: {
      status: "PENDING",
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }]
    },
    orderBy: { createdAt: "asc" },
    take: limit
  });

  let sent = 0;
  let retried = 0;
  let failed = 0;

  for (const record of records) {
    const nextAttemptCount = record.attemptCount + 1;

    try {
      await provider.send({
        to: record.to,
        subject: record.subject,
        html: record.body
      });

      await db.emailDelivery.update({
        where: { id: record.id },
        data: {
          status: "SENT",
          attemptCount: nextAttemptCount,
          nextRetryAt: null,
          lastError: null
        }
      });

      sent += 1;
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      if (nextAttemptCount >= MAX_RETRY_ATTEMPTS) {
        await db.emailDelivery.update({
          where: { id: record.id },
          data: {
            status: "FAILED",
            attemptCount: nextAttemptCount,
            nextRetryAt: null,
            lastError: errorMessage
          }
        });

        failed += 1;
      } else {
        await db.emailDelivery.update({
          where: { id: record.id },
          data: {
            status: "PENDING",
            attemptCount: nextAttemptCount,
            nextRetryAt: getNextRetryAt(now, nextAttemptCount),
            lastError: errorMessage
          }
        });

        retried += 1;
      }
    }
  }

  return {
    sent,
    retried,
    failed,
    processed: records.length
  };
}
