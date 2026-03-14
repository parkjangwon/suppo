-- CreateEnum
CREATE TYPE "SLATarget" AS ENUM ('FIRST_RESPONSE', 'RESOLUTION');

-- CreateEnum
CREATE TYPE "SLAClockStatus" AS ENUM ('RUNNING', 'PAUSED', 'STOPPED');

-- CreateEnum
CREATE TYPE "RequestTypeChannel" AS ENUM ('WEB', 'EMAIL', 'API', 'IN_APP');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT');

-- CreateEnum
CREATE TYPE "GitEventType" AS ENUM ('COMMIT_PUSHED', 'BRANCH_CREATED', 'PR_OPENED', 'PR_MERGED', 'PR_CLOSED', 'ISSUE_LINKED');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "environment" TEXT,
ADD COLUMN     "firstResponseAt" TIMESTAMP(3),
ADD COLUMN     "reopenedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requestTypeId" TEXT,
ADD COLUMN     "searchVector" tsvector,
ADD COLUMN     "serviceModule" TEXT,
ADD COLUMN     "source" "RequestTypeChannel" NOT NULL DEFAULT 'WEB',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "teamId" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "teamId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("teamId","agentId")
);

-- CreateTable
CREATE TABLE "RequestType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" "RequestTypeChannel" NOT NULL DEFAULT 'WEB',
    "defaultPriority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "defaultTeamId" TEXT,
    "autoAssignEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fieldType" "CustomFieldType" NOT NULL,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SLAPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TicketPriority" NOT NULL,
    "firstResponseHours" DOUBLE PRECISION NOT NULL,
    "resolutionHours" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SLAPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SLAClock" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "target" "SLATarget" NOT NULL,
    "status" "SLAClockStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "totalPausedMinutes" INTEGER NOT NULL DEFAULT 0,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "breachedAt" TIMESTAMP(3),
    "warningSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SLAClock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessCalendar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "workStartHour" INTEGER NOT NULL DEFAULT 9,
    "workEndHour" INTEGER NOT NULL DEFAULT 18,
    "workDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailThreadMapping" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "inReplyTo" TEXT,
    "references" TEXT[],
    "subject" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailThreadMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitEvent" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "provider" "GitProvider" NOT NULL,
    "eventType" "GitEventType" NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "ref" TEXT,
    "commitSha" TEXT,
    "commitMessage" TEXT,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "prNumber" INTEGER,
    "prTitle" TEXT,
    "prUrl" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filterConfig" JSONB NOT NULL,
    "sortConfig" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE INDEX "Team_isActive_idx" ON "Team"("isActive");

-- CreateIndex
CREATE INDEX "TeamMember_agentId_idx" ON "TeamMember"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestType_name_key" ON "RequestType"("name");

-- CreateIndex
CREATE INDEX "RequestType_isActive_idx" ON "RequestType"("isActive");

-- CreateIndex
CREATE INDEX "RequestType_sortOrder_idx" ON "RequestType"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_key_key" ON "CustomFieldDefinition"("key");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_isActive_idx" ON "CustomFieldDefinition"("isActive");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_sortOrder_idx" ON "CustomFieldDefinition"("sortOrder");

-- CreateIndex
CREATE INDEX "CustomFieldValue_ticketId_idx" ON "CustomFieldValue"("ticketId");

-- CreateIndex
CREATE INDEX "CustomFieldValue_fieldId_idx" ON "CustomFieldValue"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_ticketId_fieldId_key" ON "CustomFieldValue"("ticketId", "fieldId");

-- CreateIndex
CREATE INDEX "SLAPolicy_isActive_idx" ON "SLAPolicy"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SLAPolicy_priority_isActive_key" ON "SLAPolicy"("priority", "isActive");

-- CreateIndex
CREATE INDEX "SLAClock_ticketId_idx" ON "SLAClock"("ticketId");

-- CreateIndex
CREATE INDEX "SLAClock_policyId_idx" ON "SLAClock"("policyId");

-- CreateIndex
CREATE INDEX "SLAClock_status_idx" ON "SLAClock"("status");

-- CreateIndex
CREATE INDEX "SLAClock_deadlineAt_idx" ON "SLAClock"("deadlineAt");

-- CreateIndex
CREATE INDEX "BusinessCalendar_isActive_idx" ON "BusinessCalendar"("isActive");

-- CreateIndex
CREATE INDEX "Holiday_calendarId_idx" ON "Holiday"("calendarId");

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "EmailThreadMapping_messageId_key" ON "EmailThreadMapping"("messageId");

-- CreateIndex
CREATE INDEX "EmailThreadMapping_ticketId_idx" ON "EmailThreadMapping"("ticketId");

-- CreateIndex
CREATE INDEX "EmailThreadMapping_messageId_idx" ON "EmailThreadMapping"("messageId");

-- CreateIndex
CREATE INDEX "EmailThreadMapping_inReplyTo_idx" ON "EmailThreadMapping"("inReplyTo");

-- CreateIndex
CREATE INDEX "EmailThreadMapping_isProcessed_idx" ON "EmailThreadMapping"("isProcessed");

-- CreateIndex
CREATE INDEX "EmailThreadMapping_receivedAt_idx" ON "EmailThreadMapping"("receivedAt");

-- CreateIndex
CREATE INDEX "GitEvent_ticketId_idx" ON "GitEvent"("ticketId");

-- CreateIndex
CREATE INDEX "GitEvent_provider_idx" ON "GitEvent"("provider");

-- CreateIndex
CREATE INDEX "GitEvent_eventType_idx" ON "GitEvent"("eventType");

-- CreateIndex
CREATE INDEX "GitEvent_occurredAt_idx" ON "GitEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "SavedFilter_createdById_idx" ON "SavedFilter"("createdById");

-- CreateIndex
CREATE INDEX "SavedFilter_isShared_idx" ON "SavedFilter"("isShared");

-- CreateIndex
CREATE INDEX "Ticket_teamId_idx" ON "Ticket"("teamId");

-- CreateIndex
CREATE INDEX "Ticket_requestTypeId_idx" ON "Ticket"("requestTypeId");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- CreateIndex
CREATE INDEX "Ticket_searchVector_idx" ON "Ticket"("searchVector");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "RequestType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestType" ADD CONSTRAINT "RequestType_defaultTeamId_fkey" FOREIGN KEY ("defaultTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLAClock" ADD CONSTRAINT "SLAClock_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLAClock" ADD CONSTRAINT "SLAClock_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "SLAPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "BusinessCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitEvent" ADD CONSTRAINT "GitEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
