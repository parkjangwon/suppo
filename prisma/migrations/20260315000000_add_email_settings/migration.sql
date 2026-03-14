-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('nodemailer', 'ses', 'resend');

-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" TEXT NOT NULL DEFAULT 'nodemailer',
    "smtpHost" TEXT,
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "fromEmail" TEXT NOT NULL DEFAULT 'no-reply@crinity.io',
    "fromName" TEXT NOT NULL DEFAULT 'Crinity Ticket',
    "sesAccessKey" TEXT,
    "sesSecretKey" TEXT,
    "sesRegion" TEXT NOT NULL DEFAULT 'ap-northeast-2',
    "resendApiKey" TEXT,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnNewTicket" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnAssign" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnComment" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "notificationEmail" TEXT,
    "testMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);
