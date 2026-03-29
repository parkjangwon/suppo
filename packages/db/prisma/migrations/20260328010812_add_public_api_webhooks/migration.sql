-- CreateTable
CREATE TABLE "PublicApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PublicApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" DATETIME,
    "lastStatusCode" INTEGER,
    "lastError" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WebhookEndpoint_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicApiKey_keyPrefix_key" ON "PublicApiKey"("keyPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "PublicApiKey_keyHash_key" ON "PublicApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "PublicApiKey_isActive_createdAt_idx" ON "PublicApiKey"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "PublicApiKey_createdById_idx" ON "PublicApiKey"("createdById");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_isActive_createdAt_idx" ON "WebhookEndpoint"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_createdById_idx" ON "WebhookEndpoint"("createdById");
