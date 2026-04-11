ALTER TABLE "PublicApiKey"
ADD COLUMN "scopes" JSONB NOT NULL DEFAULT '["tickets:read","tickets:create"]';
