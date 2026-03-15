-- Add password change tracking fields to Agent table
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "isInitialPassword" BOOLEAN NOT NULL DEFAULT false;
