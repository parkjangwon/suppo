-- CreateTable
CREATE TABLE "TicketKnowledgeLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketKnowledgeLink_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketKnowledgeLink_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KnowledgeArticle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketKnowledgeLink_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TicketKnowledgeLink_articleId_idx" ON "TicketKnowledgeLink"("articleId");

-- CreateIndex
CREATE INDEX "TicketKnowledgeLink_agentId_idx" ON "TicketKnowledgeLink"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketKnowledgeLink_ticketId_articleId_key" ON "TicketKnowledgeLink"("ticketId", "articleId");
