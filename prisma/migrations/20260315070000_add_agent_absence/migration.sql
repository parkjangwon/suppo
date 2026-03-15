-- Create AbsenceType enum
CREATE TYPE "AbsenceType" AS ENUM ('VACATION', 'SICK_LEAVE', 'BUSINESS_TRIP', 'REMOTE_WORK', 'TRAINING', 'OTHER');

-- Create AgentAbsence table
CREATE TABLE "AgentAbsence" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "AbsenceType" NOT NULL DEFAULT 'VACATION',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentAbsence_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "AgentAbsence_agentId_idx" ON "AgentAbsence"("agentId");
CREATE INDEX "AgentAbsence_startDate_endDate_idx" ON "AgentAbsence"("startDate", "endDate");
CREATE INDEX "AgentAbsence_agentId_startDate_endDate_idx" ON "AgentAbsence"("agentId", "startDate", "endDate");

-- Add foreign keys
ALTER TABLE "AgentAbsence" ADD CONSTRAINT "AgentAbsence_agentId_fkey" 
    FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentAbsence" ADD CONSTRAINT "AgentAbsence_createdById_fkey" 
    FOREIGN KEY ("createdById") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
