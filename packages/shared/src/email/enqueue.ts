import { prisma } from "@crinity/db";

import {
  renderNewCommentEmail,
  renderStatusChangedEmail,
  renderTicketAssignedEmail,
  renderTicketCreatedCustomerEmail,
  renderTicketCreatedNotificationEmail,
  renderCSATSurveyEmail,
  renderSLAWarningEmail,
  renderSLABreachEmail,
} from "@crinity/shared/email/renderers";
import {
  getDefaultEmailSettings,
  shouldSendCustomerEmail,
  shouldSendInternalEmail,
} from "@crinity/shared/email/settings";
import { createThreadHeaders } from "@crinity/shared/email/threading";

type EmailDeliveryStatus = "PENDING" | "SENT" | "FAILED";
type EmailDeliveryCategory = "CUSTOMER" | "INTERNAL";

interface EmailDeliveryRecord {
  id: string;
  to: string;
  subject: string;
  body: string;
  category: EmailDeliveryCategory;
  ticketId: string | null;
  dedupeKey: string | null;
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

interface EmailQueueDbClient {
  emailDelivery: {
    findFirst?: (args: unknown) => Promise<EmailDeliveryRecord | null>;
    create: (args: unknown) => Promise<EmailDeliveryRecord>;
  };
}

export interface EnqueueEmailInput {
  to: string;
  subject: string;
  body: string;
  category: EmailDeliveryCategory;
  ticketId?: string;
  dedupeKey?: string;
  threadHeaders?: {
    messageId: string;
    inReplyTo?: string;
    references?: string[];
  };
}

export interface TicketEmailContext {
  ticketId: string;
  ticketNumber: string;
  ticketSubject: string;
  customerName: string;
  customerEmail: string;
}

async function enqueueSafely(task: () => Promise<unknown>, message: string): Promise<boolean> {
  try {
    await task();
    return true;
  } catch (error) {
    console.error(message, error);
    return false;
  }
}

async function getEmailSettings() {
  const prismaLike = prisma as unknown as {
    emailSettings?: {
      findUnique?: (args: { where: { id: string } }) => Promise<unknown>;
    };
  };
  const findUnique = prismaLike.emailSettings?.findUnique;
  if (!findUnique) {
    return getDefaultEmailSettings();
  }

  const settings = await findUnique({
    where: { id: "default" },
  }) as Record<string, unknown> | null;

  return {
    ...getDefaultEmailSettings(),
    ...(settings ?? {}),
  };
}

function parseStoredReferences(references: string | null | undefined): string[] {
  if (!references) {
    return [];
  }

  try {
    const parsed = JSON.parse(references) as unknown;
    if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")) {
      return parsed;
    }
  } catch {
    // Ignore malformed legacy values.
  }

  return [];
}

async function createDeliveryThreadHeaders(ticketId?: string) {
  if (!ticketId) {
    return createThreadHeaders();
  }

  const latestMapping = await prisma.emailThreadMapping.findFirst({
    where: { ticketId },
    orderBy: { createdAt: "desc" },
    select: {
      messageId: true,
      references: true,
    },
  });

  return createThreadHeaders(
    latestMapping?.messageId,
    parseStoredReferences(latestMapping?.references),
  );
}

async function persistQueuedThreadMapping(
  ticketId: string,
  to: string,
  subject: string,
  messageId: string,
  inReplyTo?: string,
  references?: string[],
) {
  const settings = await getEmailSettings();

  await prisma.emailThreadMapping.upsert({
    where: { messageId },
    update: {
      inReplyTo: inReplyTo ?? null,
      references: references ? JSON.stringify(references) : null,
      subject,
      fromAddress: settings.fromEmail,
      toAddress: to,
      processedAt: null,
      processingError: null,
      isProcessed: false,
    },
    create: {
      ticketId,
      messageId,
      inReplyTo: inReplyTo ?? null,
      references: references ? JSON.stringify(references) : null,
      subject,
      fromAddress: settings.fromEmail,
      toAddress: to,
      isProcessed: false,
    },
  });
}

export async function enqueueEmail(
  input: EnqueueEmailInput,
  db: EmailQueueDbClient = prisma as unknown as EmailQueueDbClient,
): Promise<EmailDeliveryRecord> {
  if (input.dedupeKey && db.emailDelivery.findFirst) {
    const existing = await db.emailDelivery.findFirst({
      where: {
        dedupeKey: input.dedupeKey,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return existing;
    }
  }

  const result = await db.emailDelivery.create({
    data: {
      to: input.to,
      subject: input.subject,
      body: input.body,
      category: input.category,
      ticketId: input.ticketId ?? null,
      dedupeKey: input.dedupeKey ?? null,
      messageId: input.threadHeaders?.messageId ?? null,
      inReplyTo: input.threadHeaders?.inReplyTo ?? null,
      references: input.threadHeaders?.references
        ? JSON.stringify(input.threadHeaders.references)
        : null,
      status: "PENDING",
    },
  });

  if (input.ticketId && input.threadHeaders?.messageId) {
    await persistQueuedThreadMapping(
      input.ticketId,
      input.to,
      input.subject,
      input.threadHeaders.messageId,
      input.threadHeaders.inReplyTo,
      input.threadHeaders.references,
    );
  }

  return result;
}

function uniqueRecipients(...values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean) as string[])];
}

export async function enqueueTicketCreatedEmails(
  context: TicketEmailContext,
  _notificationEmail?: string,
  db: EmailQueueDbClient = prisma as unknown as EmailQueueDbClient,
): Promise<void> {
  const settings = await getEmailSettings();

  if (shouldSendCustomerEmail(settings, "ticketCreated")) {
    await enqueueSafely(async () => {
      const email = renderTicketCreatedCustomerEmail({
        ticketNumber: context.ticketNumber,
        customerName: context.customerName,
        ticketSubject: context.ticketSubject,
      });

      await enqueueEmail(
        {
          to: context.customerEmail,
          subject: email.subject,
          body: email.body,
          category: "CUSTOMER",
          ticketId: context.ticketId,
          threadHeaders: await createDeliveryThreadHeaders(context.ticketId),
        },
        db,
      );
    }, "Failed to enqueue ticket-created customer email");
  }

  const notificationEmail = settings.notificationEmail?.trim();

  if (shouldSendInternalEmail(settings, "newTicket") && notificationEmail) {
    await enqueueSafely(async () => {
      const notification = renderTicketCreatedNotificationEmail({
        ticketId: context.ticketId,
        ticketNumber: context.ticketNumber,
        customerName: context.customerName,
        ticketSubject: context.ticketSubject,
      });

      await enqueueEmail(
        {
          to: notificationEmail,
          subject: notification.subject,
          body: notification.body,
          category: "INTERNAL",
        },
        db,
      );
    }, "Failed to enqueue ticket-created notification email");
  }
}

export async function enqueueTicketAssignedEmail(
  assigneeEmail: string,
  context: TicketEmailContext,
  assigneeName: string,
  db: EmailQueueDbClient = prisma as unknown as EmailQueueDbClient,
): Promise<void> {
  const settings = await getEmailSettings();
  if (!shouldSendInternalEmail(settings, "assign")) {
    return;
  }

  await enqueueSafely(async () => {
    const email = renderTicketAssignedEmail({
      ticketId: context.ticketId,
      assigneeName,
      ticketNumber: context.ticketNumber,
      ticketSubject: context.ticketSubject,
      customerName: context.customerName,
    });

    await enqueueEmail(
      {
        to: assigneeEmail,
        subject: email.subject,
        body: email.body,
        category: "INTERNAL",
      },
      db,
    );
  }, "Failed to enqueue ticket-assigned email");
}

export async function enqueueNewCommentEmail(
  recipientEmail: string,
  ticketNumber: string,
  commenterName: string,
  isCustomerRecipient: boolean,
  db: EmailQueueDbClient = prisma as unknown as EmailQueueDbClient,
  options?: { ticketId?: string; dedupeKey?: string },
): Promise<void> {
  const settings = await getEmailSettings();
  const allowed = isCustomerRecipient
    ? shouldSendCustomerEmail(settings, "agentReply")
    : shouldSendInternalEmail(settings, "comment");

  if (!allowed) {
    return;
  }

  await enqueueSafely(async () => {
    const email = renderNewCommentEmail({
      ticketId: options?.ticketId,
      recipientType: isCustomerRecipient ? "CUSTOMER" : "AGENT",
      ticketNumber,
      commenterName,
    });

    await enqueueEmail(
      {
        to: recipientEmail,
        subject: email.subject,
        body: email.body,
        category: isCustomerRecipient ? "CUSTOMER" : "INTERNAL",
        ticketId: isCustomerRecipient ? options?.ticketId : undefined,
        dedupeKey: options?.dedupeKey,
        threadHeaders:
          isCustomerRecipient && options?.ticketId
            ? await createDeliveryThreadHeaders(options.ticketId)
            : undefined,
      },
      db,
    );
  }, "Failed to enqueue new-comment email");
}

export async function enqueueInternalCommentNotifications(
  recipients: Array<string | null | undefined>,
  ticketNumber: string,
  commenterName: string,
  db: EmailQueueDbClient = prisma as unknown as EmailQueueDbClient,
  options?: { ticketId?: string; commentId?: string },
): Promise<void> {
  for (const recipient of uniqueRecipients(...recipients)) {
    await enqueueNewCommentEmail(
      recipient,
      ticketNumber,
      commenterName,
      false,
      db,
      {
        ticketId: options?.ticketId,
        dedupeKey: options?.commentId
          ? `comment:${options.commentId}:internal:${recipient}`
          : undefined,
      }
    );
  }
}

export async function enqueueStatusChangedEmail(
  recipientEmail: string,
  ticketNumber: string,
  oldStatus: string,
  newStatus: string,
  db: EmailQueueDbClient = prisma as unknown as EmailQueueDbClient,
  options?: {
    recipientCategory?: EmailDeliveryCategory;
    ticketId?: string;
  },
): Promise<void> {
  const settings = await getEmailSettings();
  const category = options?.recipientCategory ?? "INTERNAL";
  const allowed =
    category === "CUSTOMER"
      ? shouldSendCustomerEmail(settings, "statusChanged")
      : shouldSendInternalEmail(settings, "statusChange");

  if (!allowed) {
    return;
  }

  await enqueueSafely(async () => {
    const email = renderStatusChangedEmail({
      ticketId: options?.ticketId,
      ticketNumber,
      oldStatus,
      newStatus,
    });

    await enqueueEmail(
      {
        to: recipientEmail,
        subject: email.subject,
        body: email.body,
        category,
        ticketId: category === "CUSTOMER" ? options?.ticketId : undefined,
        threadHeaders:
          category === "CUSTOMER" && options?.ticketId
            ? await createDeliveryThreadHeaders(options.ticketId)
            : undefined,
      },
      db,
    );
  }, "Failed to enqueue status-changed email");
}

export async function enqueueInternalStatusNotifications(
  recipients: Array<string | null | undefined>,
  ticketNumber: string,
  oldStatus: string,
  newStatus: string,
  db: EmailQueueDbClient = prisma as unknown as EmailQueueDbClient,
  options?: { ticketId?: string },
): Promise<void> {
  for (const recipient of uniqueRecipients(...recipients)) {
    await enqueueStatusChangedEmail(
      recipient,
      ticketNumber,
      oldStatus,
      newStatus,
      db,
      { recipientCategory: "INTERNAL", ticketId: options?.ticketId },
    );
  }
}

export async function enqueueSLAWarningEmail(
  assigneeEmail: string | null | undefined,
  adminEmail: string | null | undefined,
  ticketNumber: string,
  assigneeName: string,
  targetLabel: string,
  minutesRemaining: number,
  db: EmailQueueDbClient = prisma as unknown as EmailQueueDbClient,
): Promise<void> {
  const settings = await getEmailSettings();
  if (!shouldSendInternalEmail(settings, "slaWarning")) {
    return;
  }

  const recipients = uniqueRecipients(assigneeEmail, adminEmail);
  for (const to of recipients) {
    await enqueueSafely(async () => {
      const email = renderSLAWarningEmail({ ticketNumber, assigneeName, targetLabel, minutesRemaining });
      await enqueueEmail({ to, subject: email.subject, body: email.body, category: "INTERNAL" }, db);
    }, `Failed to enqueue SLA warning email to ${to}`);
  }
}

export async function enqueueSLABreachEmail(
  assigneeEmail: string | null | undefined,
  adminEmail: string | null | undefined,
  ticketNumber: string,
  assigneeName: string,
  targetLabel: string,
  db: EmailQueueDbClient = prisma as unknown as EmailQueueDbClient,
): Promise<void> {
  const settings = await getEmailSettings();
  if (!shouldSendInternalEmail(settings, "slaBreach")) {
    return;
  }

  const recipients = uniqueRecipients(assigneeEmail, adminEmail);
  for (const to of recipients) {
    await enqueueSafely(async () => {
      const email = renderSLABreachEmail({ ticketNumber, assigneeName, targetLabel });
      await enqueueEmail({ to, subject: email.subject, body: email.body, category: "INTERNAL" }, db);
    }, `Failed to enqueue SLA breach email to ${to}`);
  }
}

export async function enqueueCSATSurveyEmail(
  ticketId: string,
  ticketNumber: string,
  ticketSubject: string,
  customerEmail: string,
  customerName: string,
  db: EmailQueueDbClient = prisma as unknown as EmailQueueDbClient,
): Promise<void> {
  const settings = await getEmailSettings();
  if (!shouldSendCustomerEmail(settings, "csatSurvey")) {
    return;
  }

  await enqueueSafely(async () => {
    const email = renderCSATSurveyEmail({
      ticketId,
      ticketNumber,
      customerName,
      ticketSubject,
    });

    await enqueueEmail(
      {
        to: customerEmail,
        subject: email.subject,
        body: email.body,
        category: "CUSTOMER",
        ticketId,
        threadHeaders: await createDeliveryThreadHeaders(ticketId),
      },
      db,
    );
  }, "Failed to enqueue CSAT survey email");
}
