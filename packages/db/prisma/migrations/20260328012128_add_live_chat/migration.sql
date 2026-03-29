-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "widgetKey" TEXT NOT NULL,
    "customerTokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING_AGENT',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCustomerMessageAt" DATETIME,
    "lastAgentMessageAt" DATETIME,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatConversation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatEvent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatWidgetSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "widgetKey" TEXT NOT NULL,
    "buttonLabel" TEXT NOT NULL DEFAULT '채팅 상담',
    "welcomeTitle" TEXT NOT NULL DEFAULT '실시간 채팅 상담',
    "welcomeMessage" TEXT NOT NULL DEFAULT '메시지를 남기면 상담원이 바로 응답합니다.',
    "accentColor" TEXT NOT NULL DEFAULT '#0f172a',
    "position" TEXT NOT NULL DEFAULT 'bottom-right',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatConversation_ticketId_key" ON "ChatConversation"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatConversation_customerTokenHash_key" ON "ChatConversation"("customerTokenHash");

-- CreateIndex
CREATE INDEX "ChatConversation_status_lastMessageAt_idx" ON "ChatConversation"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatConversation_widgetKey_createdAt_idx" ON "ChatConversation"("widgetKey", "createdAt");

-- CreateIndex
CREATE INDEX "ChatEvent_conversationId_createdAt_idx" ON "ChatEvent"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatEvent_ticketId_createdAt_idx" ON "ChatEvent"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatEvent_type_createdAt_idx" ON "ChatEvent"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatWidgetSettings_widgetKey_key" ON "ChatWidgetSettings"("widgetKey");
