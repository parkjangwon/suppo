-- AlterTable
ALTER TABLE "ResponseTemplate" ADD COLUMN "variables" JSONB,
ADD COLUMN "isShared" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ResponseTemplate_sortOrder_idx" ON "ResponseTemplate"("sortOrder");
