-- CreateTable
CREATE TABLE "GitOperationQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "processedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "GitOperationQueue_status_idx" ON "GitOperationQueue"("status");

-- CreateIndex
CREATE INDEX "GitOperationQueue_retryCount_idx" ON "GitOperationQueue"("retryCount");

-- CreateIndex
CREATE INDEX "GitOperationQueue_createdAt_idx" ON "GitOperationQueue"("createdAt");
