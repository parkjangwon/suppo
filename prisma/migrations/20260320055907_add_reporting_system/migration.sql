-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "hour" INTEGER NOT NULL DEFAULT 9,
    "minute" INTEGER NOT NULL DEFAULT 0,
    "formats" JSONB NOT NULL,
    "recipients" JSONB NOT NULL,
    "filters" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "lastRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportSchedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT,
    "requestedById" TEXT,
    "triggerSource" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "periodKey" TEXT NOT NULL,
    "parameters" JSONB,
    "fileName" TEXT,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "errorMessage" TEXT,
    "generatedAt" DATETIME,
    "emailedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GeneratedReport_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ReportSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GeneratedReport_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ReportSchedule_createdById_idx" ON "ReportSchedule"("createdById");

-- CreateIndex
CREATE INDEX "ReportSchedule_isActive_frequency_idx" ON "ReportSchedule"("isActive", "frequency");

-- CreateIndex
CREATE INDEX "GeneratedReport_status_createdAt_idx" ON "GeneratedReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedReport_scheduleId_createdAt_idx" ON "GeneratedReport"("scheduleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedReport_scheduleId_reportType_format_periodKey_key" ON "GeneratedReport"("scheduleId", "reportType", "format", "periodKey");
