ALTER TABLE "EmailDelivery" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "EmailDelivery" ADD COLUMN "ticketId" TEXT;
ALTER TABLE "EmailDelivery" ADD COLUMN "messageId" TEXT;
ALTER TABLE "EmailDelivery" ADD COLUMN "inReplyTo" TEXT;
ALTER TABLE "EmailDelivery" ADD COLUMN "references" TEXT;

CREATE INDEX "EmailDelivery_category_status_nextRetryAt_idx"
ON "EmailDelivery"("category", "status", "nextRetryAt");

CREATE INDEX "EmailDelivery_ticketId_idx"
ON "EmailDelivery"("ticketId");

CREATE INDEX "EmailDelivery_messageId_idx"
ON "EmailDelivery"("messageId");

CREATE TABLE "new_EmailSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'nodemailer',
    "smtpHost" TEXT,
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "fromEmail" TEXT NOT NULL DEFAULT 'no-reply@company.com',
    "fromName" TEXT NOT NULL DEFAULT 'Crinity Helpdesk',
    "sesAccessKey" TEXT,
    "sesSecretKey" TEXT,
    "sesRegion" TEXT NOT NULL DEFAULT 'ap-northeast-2',
    "resendApiKey" TEXT,
    "customerEmailsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "internalNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnNewTicket" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnAssign" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnComment" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnSlaWarning" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnSlaBreach" BOOLEAN NOT NULL DEFAULT true,
    "notifyCustomerOnTicketCreated" BOOLEAN NOT NULL DEFAULT false,
    "notifyCustomerOnAgentReply" BOOLEAN NOT NULL DEFAULT false,
    "notifyCustomerOnStatusChange" BOOLEAN NOT NULL DEFAULT false,
    "notifyCustomerOnCsatSurvey" BOOLEAN NOT NULL DEFAULT false,
    "notificationEmail" TEXT,
    "testMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_EmailSettings" (
    "id",
    "provider",
    "smtpHost",
    "smtpPort",
    "smtpSecure",
    "smtpUser",
    "smtpPassword",
    "fromEmail",
    "fromName",
    "sesAccessKey",
    "sesSecretKey",
    "sesRegion",
    "resendApiKey",
    "customerEmailsEnabled",
    "internalNotificationsEnabled",
    "notifyOnNewTicket",
    "notifyOnAssign",
    "notifyOnComment",
    "notifyOnStatusChange",
    "notifyOnSlaWarning",
    "notifyOnSlaBreach",
    "notifyCustomerOnTicketCreated",
    "notifyCustomerOnAgentReply",
    "notifyCustomerOnStatusChange",
    "notifyCustomerOnCsatSurvey",
    "notificationEmail",
    "testMode",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "provider",
    "smtpHost",
    "smtpPort",
    "smtpSecure",
    "smtpUser",
    "smtpPassword",
    "fromEmail",
    "fromName",
    "sesAccessKey",
    "sesSecretKey",
    "sesRegion",
    "resendApiKey",
    CASE WHEN "notificationsEnabled" = true THEN true ELSE false END,
    CASE WHEN "notificationsEnabled" = true THEN true ELSE false END,
    "notifyOnNewTicket",
    "notifyOnAssign",
    "notifyOnComment",
    "notifyOnStatusChange",
    true,
    true,
    CASE WHEN "notificationsEnabled" = true THEN true ELSE false END,
    CASE WHEN "notificationsEnabled" = true THEN true ELSE false END,
    CASE WHEN "notificationsEnabled" = true THEN true ELSE false END,
    CASE WHEN "notificationsEnabled" = true THEN true ELSE false END,
    "notificationEmail",
    "testMode",
    "createdAt",
    "updatedAt"
FROM "EmailSettings";

DROP TABLE "EmailSettings";
ALTER TABLE "new_EmailSettings" RENAME TO "EmailSettings";
