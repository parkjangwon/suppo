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

type EmailDeliveryStatus = "PENDING" | "SENT" | "FAILED";

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

interface EmailQueueDbClient {
  emailDelivery: {
    create: (args: {
      data: {
        to: string;
        subject: string;
        body: string;
        status: "PENDING";
      };
    }) => Promise<EmailDeliveryRecord>;
  };
}

export interface EnqueueEmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface TicketEmailContext {
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

export async function enqueueEmail(
  input: EnqueueEmailInput,
  db: EmailQueueDbClient = prisma
): Promise<EmailDeliveryRecord> {
  return db.emailDelivery.create({
    data: {
      to: input.to,
      subject: input.subject,
      body: input.body,
      status: "PENDING"
    }
  });
}

export async function enqueueTicketCreatedEmails(
  context: TicketEmailContext,
  notificationEmail: string,
  db: EmailQueueDbClient = prisma
): Promise<void> {
  await enqueueSafely(async () => {
    const customerEmail = renderTicketCreatedCustomerEmail({
      ticketNumber: context.ticketNumber,
      customerName: context.customerName,
      ticketSubject: context.ticketSubject
    });

    await enqueueEmail(
      {
        to: context.customerEmail,
        subject: customerEmail.subject,
        body: customerEmail.body
      },
      db
    );
  }, "Failed to enqueue ticket-created customer email");

  await enqueueSafely(async () => {
    const notification = renderTicketCreatedNotificationEmail({
      ticketNumber: context.ticketNumber,
      customerName: context.customerName,
      ticketSubject: context.ticketSubject
    });

    await enqueueEmail(
      {
        to: notificationEmail,
        subject: notification.subject,
        body: notification.body
      },
      db
    );
  }, "Failed to enqueue ticket-created notification email");
}

export async function enqueueTicketAssignedEmail(
  assigneeEmail: string,
  context: TicketEmailContext,
  assigneeName: string,
  db: EmailQueueDbClient = prisma
): Promise<void> {
  await enqueueSafely(async () => {
    const email = renderTicketAssignedEmail({
      assigneeName,
      ticketNumber: context.ticketNumber,
      ticketSubject: context.ticketSubject,
      customerName: context.customerName
    });

    await enqueueEmail(
      {
        to: assigneeEmail,
        subject: email.subject,
        body: email.body
      },
      db
    );
  }, "Failed to enqueue ticket-assigned email");
}

export async function enqueueNewCommentEmail(
  recipientEmail: string,
  ticketNumber: string,
  commenterName: string,
  isCustomerRecipient: boolean,
  db: EmailQueueDbClient = prisma
): Promise<void> {
  await enqueueSafely(async () => {
    const email = renderNewCommentEmail({
      recipientType: isCustomerRecipient ? "CUSTOMER" : "AGENT",
      ticketNumber,
      commenterName
    });

    await enqueueEmail(
      {
        to: recipientEmail,
        subject: email.subject,
        body: email.body
      },
      db
    );
  }, "Failed to enqueue new-comment email");
}

export async function enqueueStatusChangedEmail(
  recipientEmail: string,
  ticketNumber: string,
  oldStatus: string,
  newStatus: string,
  db: EmailQueueDbClient = prisma
): Promise<void> {
  await enqueueSafely(async () => {
    const email = renderStatusChangedEmail({
      ticketNumber,
      oldStatus,
      newStatus
    });

    await enqueueEmail(
      {
        to: recipientEmail,
        subject: email.subject,
        body: email.body
      },
      db
    );
  }, "Failed to enqueue status-changed email");
}

export async function enqueueSLAWarningEmail(
  assigneeEmail: string | null | undefined,
  adminEmail: string | null | undefined,
  ticketNumber: string,
  assigneeName: string,
  targetLabel: string,
  minutesRemaining: number,
  db: EmailQueueDbClient = prisma
): Promise<void> {
  const recipients = [assigneeEmail, adminEmail].filter(Boolean) as string[];
  for (const to of recipients) {
    await enqueueSafely(async () => {
      const email = renderSLAWarningEmail({ ticketNumber, assigneeName, targetLabel, minutesRemaining });
      await enqueueEmail({ to, subject: email.subject, body: email.body }, db);
    }, `Failed to enqueue SLA warning email to ${to}`);
  }
}

export async function enqueueSLABreachEmail(
  assigneeEmail: string | null | undefined,
  adminEmail: string | null | undefined,
  ticketNumber: string,
  assigneeName: string,
  targetLabel: string,
  db: EmailQueueDbClient = prisma
): Promise<void> {
  const recipients = [...new Set([assigneeEmail, adminEmail].filter(Boolean) as string[])];
  for (const to of recipients) {
    await enqueueSafely(async () => {
      const email = renderSLABreachEmail({ ticketNumber, assigneeName, targetLabel });
      await enqueueEmail({ to, subject: email.subject, body: email.body }, db);
    }, `Failed to enqueue SLA breach email to ${to}`);
  }
}

export async function enqueueCSATSurveyEmail(
  ticketId: string,
  ticketNumber: string,
  ticketSubject: string,
  customerEmail: string,
  customerName: string,
  db: EmailQueueDbClient = prisma
): Promise<void> {
  await enqueueSafely(async () => {
    const email = renderCSATSurveyEmail({
      ticketNumber,
      customerName,
      ticketSubject
    });

    await enqueueEmail(
      {
        to: customerEmail,
        subject: email.subject,
        body: email.body
      },
      db
    );
  }, "Failed to enqueue CSAT survey email");
}
