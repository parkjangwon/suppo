-- Add phone field to Agent model
ALTER TABLE "Agent" ADD COLUMN "phone" TEXT;

-- Create Customer model
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "memo" TEXT,
    "analysis" TEXT,
    "analyzedAt" TIMESTAMP(3),
    "ticketCount" INTEGER NOT NULL DEFAULT 0,
    "lastTicketAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Add customerId to Ticket model
ALTER TABLE "Ticket" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Ticket_customerId_idx" ON "Ticket"("customerId");

-- Create LLMSettings model
CREATE TABLE "LLMSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'ollama',
    "ollamaUrl" TEXT NOT NULL DEFAULT 'http://localhost:11434',
    "ollamaModel" TEXT NOT NULL DEFAULT 'llama3.2',
    "geminiApiKey" TEXT,
    "geminiModel" TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    "analysisEnabled" BOOLEAN NOT NULL DEFAULT false,
    "analysisPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create index on Customer email
CREATE INDEX "Customer_email_idx" ON "Customer"("email");
CREATE INDEX "Customer_lastTicketAt_idx" ON "Customer"("lastTicketAt");
