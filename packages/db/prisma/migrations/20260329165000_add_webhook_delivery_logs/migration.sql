-- CreateTable
CREATE TABLE "WebhookDeliveryLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpointId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "requestBody" JSONB,
    "responseStatusCode" INTEGER,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookDeliveryLog_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WebhookDeliveryLog_endpointId_createdAt_idx" ON "WebhookDeliveryLog"("endpointId", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookDeliveryLog_event_createdAt_idx" ON "WebhookDeliveryLog"("event", "createdAt");
