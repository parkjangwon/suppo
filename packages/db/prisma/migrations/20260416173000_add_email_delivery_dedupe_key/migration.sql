ALTER TABLE "EmailDelivery" ADD COLUMN "dedupeKey" TEXT;

CREATE INDEX "EmailDelivery_dedupeKey_idx"
ON "EmailDelivery"("dedupeKey");
