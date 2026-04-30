-- Fresh PostgreSQL deployment optimizations.
-- Existing data migration is intentionally out of scope before launch.

ALTER TABLE "KnowledgeArticle"
  DROP COLUMN "tags",
  ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "Ticket_tags_idx" ON "Ticket" USING GIN ("tags");
CREATE INDEX "KnowledgeArticle_tags_idx" ON "KnowledgeArticle" USING GIN ("tags");
CREATE INDEX "CustomerSatisfaction_submittedAt_idx" ON "CustomerSatisfaction"("submittedAt");
CREATE INDEX "Ticket_customerEmail_createdAt_idx" ON "Ticket"("customerEmail", "createdAt");
CREATE INDEX "Ticket_teamId_status_createdAt_idx" ON "Ticket"("teamId", "status", "createdAt");
CREATE INDEX "KnowledgeArticle_public_listing_idx" ON "KnowledgeArticle"("isPublished", "isPublic", "viewCount", "updatedAt");
