-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('URGENT', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "AgentRole" AS ENUM ('ADMIN', 'TEAM_LEAD', 'AGENT', 'VIEWER');

-- CreateEnum
CREATE TYPE "AuthorType" AS ENUM ('CUSTOMER', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATED', 'ASSIGNED', 'STATUS_CHANGED', 'TRANSFERRED', 'PRIORITY_CHANGED', 'MERGED', 'UNMERGED');

-- CreateEnum
CREATE TYPE "GitProvider" AS ENUM ('GITHUB', 'GITLAB');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('CREDENTIALS', 'GOOGLE', 'GITHUB', 'SAML');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailDeliveryCategory" AS ENUM ('CUSTOMER', 'INTERNAL');

-- CreateEnum
CREATE TYPE "SLATarget" AS ENUM ('FIRST_RESPONSE', 'RESOLUTION');

-- CreateEnum
CREATE TYPE "SLAClockStatus" AS ENUM ('RUNNING', 'PAUSED', 'STOPPED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('OPERATIONAL', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('EXCEL', 'PDF');

-- CreateEnum
CREATE TYPE "ReportFrequency" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ReportRunStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportTriggerSource" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "RequestTypeChannel" AS ENUM ('WEB', 'EMAIL', 'API', 'IN_APP');

-- CreateEnum
CREATE TYPE "ChatConversationStatus" AS ENUM ('WAITING_AGENT', 'ACTIVE', 'WAITING_CUSTOMER', 'ENDED');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT');

-- CreateEnum
CREATE TYPE "GitEventType" AS ENUM ('COMMIT_PUSHED', 'BRANCH_CREATED', 'PR_OPENED', 'PR_MERGED', 'PR_CLOSED', 'ISSUE_LINKED');

-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('VACATION', 'SICK_LEAVE', 'BUSINESS_TRIP', 'REMOTE_WORK', 'TRAINING', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'ASSIGN', 'TRANSFER', 'STATUS_CHANGE', 'PRIORITY_CHANGE', 'SETTINGS_CHANGE', 'PASSWORD_RESET', 'ACTIVATE', 'DEACTIVATE', 'USE');

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerOrganization" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "priority" "TicketPriority" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeId" TEXT,
    "requestTypeId" TEXT,
    "teamId" TEXT,
    "source" "RequestTypeChannel" NOT NULL DEFAULT 'WEB',
    "environment" TEXT,
    "serviceModule" TEXT,
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "reopenedCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "searchVector" TEXT,
    "summary" TEXT,
    "summaryUpdatedAt" TIMESTAMP(3),
    "mergedIntoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "AgentRole" NOT NULL DEFAULT 'AGENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxTickets" INTEGER NOT NULL DEFAULT 10,
    "avatarUrl" TEXT,
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'CREDENTIALS',
    "passwordHash" TEXT,
    "passwordChangedAt" TIMESTAMP(3),
    "isInitialPassword" BOOLEAN NOT NULL DEFAULT false,
    "lastAssignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorType" "AuthorType" NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "description" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "memo" TEXT,
    "analysis" TEXT,
    "analyzedAt" TIMESTAMP(3),
    "ticketCount" INTEGER NOT NULL DEFAULT 0,
    "lastTicketAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCategory" (
    "agentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentCategory_pkey" PRIMARY KEY ("agentId","categoryId")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorType" "AuthorType" NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "commentId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "widgetKey" TEXT NOT NULL,
    "customerTokenHash" TEXT NOT NULL,
    "status" "ChatConversationStatus" NOT NULL DEFAULT 'WAITING_AGENT',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCustomerMessageAt" TIMESTAMP(3),
    "lastAgentMessageAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatEvent" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitLink" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "provider" "GitProvider" NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "issueNumber" INTEGER NOT NULL,
    "issueUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketTransfer" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromAgentId" TEXT NOT NULL,
    "toAgentId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "categoryId" TEXT,
    "requestTypeId" TEXT,
    "createdById" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT true,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketActivity" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "actorType" "AuthorType" NOT NULL,
    "actorId" TEXT,
    "action" "ActivityAction" NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitProviderCredential" (
    "id" TEXT NOT NULL,
    "provider" "GitProvider" NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDelivery" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "EmailDeliveryCategory" NOT NULL,
    "ticketId" TEXT,
    "dedupeKey" TEXT,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "references" TEXT,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SAMLProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "idpEntityId" TEXT NOT NULL,
    "idpSsoUrl" TEXT NOT NULL,
    "idpSloUrl" TEXT,
    "idpCertificate" TEXT NOT NULL,
    "spAcsUrl" TEXT NOT NULL,
    "spEntityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SAMLProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemBranding" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'Suppo',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0f172a',
    "secondaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "homepageTitle" TEXT NOT NULL DEFAULT 'Suppo',
    "homepageSubtitle" TEXT NOT NULL DEFAULT '민원 티켓을 생성하고 상태를 바로 조회할 수 있습니다.',
    "adminPanelTitle" TEXT NOT NULL DEFAULT 'Suppo Admin',
    "appTitle" TEXT NOT NULL DEFAULT '고객 지원 센터',
    "welcomeMessage" TEXT NOT NULL DEFAULT '무엇을 도와드릴까요?',
    "footerText" TEXT NOT NULL DEFAULT '© 2026 parkjangwon. All rights reserved.',
    "footerPhone" TEXT,
    "footerEmail" TEXT,
    "footerHomepage" TEXT,
    "footerAddress" TEXT,
    "showPoweredBy" BOOLEAN NOT NULL DEFAULT true,
    "knowledgeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "customCss" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemBranding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" TEXT NOT NULL DEFAULT 'nodemailer',
    "smtpHost" TEXT,
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "fromEmail" TEXT NOT NULL DEFAULT 'no-reply@company.com',
    "fromName" TEXT NOT NULL DEFAULT 'Suppo',
    "sesAccessKey" TEXT,
    "sesSecretKey" TEXT,
    "sesRegion" TEXT NOT NULL DEFAULT 'ap-northeast-2',
    "resendApiKey" TEXT,
    "customerEmailsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "internalNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnNewTicket" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnAssign" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnComment" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnSlaWarning" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnSlaBreach" BOOLEAN NOT NULL DEFAULT true,
    "notifyCustomerOnTicketCreated" BOOLEAN NOT NULL DEFAULT false,
    "notifyCustomerOnAgentReply" BOOLEAN NOT NULL DEFAULT false,
    "notifyCustomerOnStatusChange" BOOLEAN NOT NULL DEFAULT false,
    "notifyCustomerOnCsatSurvey" BOOLEAN NOT NULL DEFAULT false,
    "notificationEmail" TEXT,
    "testMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" TEXT NOT NULL DEFAULT 'ollama',
    "ollamaUrl" TEXT NOT NULL DEFAULT 'http://localhost:11434',
    "ollamaModel" TEXT NOT NULL DEFAULT 'gemma3:4b',
    "geminiApiKey" TEXT,
    "geminiModel" TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    "analysisEnabled" BOOLEAN NOT NULL DEFAULT false,
    "analysisPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LLMSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "teamId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("teamId","agentId")
);

-- CreateTable
CREATE TABLE "RequestType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" "RequestTypeChannel" NOT NULL DEFAULT 'WEB',
    "defaultPriority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "defaultTeamId" TEXT,
    "categoryId" TEXT,
    "autoAssignEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fieldType" "CustomFieldType" NOT NULL,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SLAPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TicketPriority" NOT NULL,
    "firstResponseHours" DOUBLE PRECISION NOT NULL,
    "resolutionHours" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SLAPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SLAClock" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "target" "SLATarget" NOT NULL,
    "status" "SLAClockStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "totalPausedMinutes" INTEGER NOT NULL DEFAULT 0,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "breachedAt" TIMESTAMP(3),
    "warningSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SLAClock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessCalendar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "workStartHour" INTEGER NOT NULL DEFAULT 9,
    "workEndHour" INTEGER NOT NULL DEFAULT 18,
    "workDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailThreadMapping" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "inReplyTo" TEXT,
    "references" TEXT,
    "subject" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailThreadMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitEvent" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "provider" "GitProvider" NOT NULL,
    "eventType" "GitEventType" NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "ref" TEXT,
    "commitSha" TEXT,
    "commitMessage" TEXT,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "prNumber" INTEGER,
    "prTitle" TEXT,
    "prUrl" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filterConfig" JSONB NOT NULL,
    "sortConfig" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitOperationQueue" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "provider" "GitProvider" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "GitOperationQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '["tickets:read","tickets:create"]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastStatusCode" INTEGER,
    "lastError" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDeliveryLog" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "requestBody" JSONB,
    "responseStatusCode" INTEGER,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatWidgetSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "widgetKey" TEXT NOT NULL,
    "buttonLabel" TEXT NOT NULL DEFAULT '채팅 상담',
    "buttonImageUrl" TEXT,
    "buttonImageFit" TEXT NOT NULL DEFAULT 'contain',
    "buttonBorderColor" TEXT,
    "buttonBorderWidth" INTEGER NOT NULL DEFAULT 0,
    "buttonHoverEffect" TEXT NOT NULL DEFAULT 'lift',
    "buttonBadgeText" TEXT,
    "buttonBadgeColor" TEXT NOT NULL DEFAULT '#ef4444',
    "buttonBadgePosition" TEXT NOT NULL DEFAULT 'top-right',
    "showUnreadBadge" BOOLEAN NOT NULL DEFAULT true,
    "buttonSize" TEXT NOT NULL DEFAULT 'md',
    "buttonShape" TEXT NOT NULL DEFAULT 'pill',
    "buttonShadow" TEXT NOT NULL DEFAULT 'soft',
    "welcomeTitle" TEXT NOT NULL DEFAULT '실시간 채팅 상담',
    "welcomeMessage" TEXT NOT NULL DEFAULT '메시지를 남기면 상담원이 바로 응답합니다.',
    "accentColor" TEXT NOT NULL DEFAULT '#0f172a',
    "position" TEXT NOT NULL DEFAULT 'bottom-right',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "agentResponseTargetMinutes" INTEGER NOT NULL DEFAULT 5,
    "customerFollowupTargetMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatWidgetSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatWidgetProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widgetKey" TEXT NOT NULL,
    "buttonLabel" TEXT NOT NULL,
    "buttonImageUrl" TEXT,
    "buttonImageFit" TEXT NOT NULL DEFAULT 'contain',
    "buttonBorderColor" TEXT,
    "buttonBorderWidth" INTEGER NOT NULL DEFAULT 0,
    "buttonHoverEffect" TEXT NOT NULL DEFAULT 'lift',
    "buttonBadgeText" TEXT,
    "buttonBadgeColor" TEXT NOT NULL DEFAULT '#ef4444',
    "buttonBadgePosition" TEXT NOT NULL DEFAULT 'top-right',
    "showUnreadBadge" BOOLEAN NOT NULL DEFAULT true,
    "buttonSize" TEXT NOT NULL DEFAULT 'md',
    "buttonShape" TEXT NOT NULL DEFAULT 'pill',
    "buttonShadow" TEXT NOT NULL DEFAULT 'soft',
    "welcomeTitle" TEXT NOT NULL,
    "welcomeMessage" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'bottom-right',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "agentResponseTargetMinutes" INTEGER NOT NULL DEFAULT 5,
    "customerFollowupTargetMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatWidgetProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMerge" (
    "id" TEXT NOT NULL,
    "sourceTicketId" TEXT NOT NULL,
    "targetTicketId" TEXT NOT NULL,
    "mergedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mergedBy" TEXT NOT NULL,

    CONSTRAINT "TicketMerge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "triggerOn" TEXT DEFAULT 'TICKET_CREATED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSatisfaction" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerEmail" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSatisfaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeArticle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "categoryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "lastEditedById" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "tags" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeArticleFeedback" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "wasHelpful" BOOLEAN NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeArticleFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketPresence" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketCommentLock" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketCommentLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "frequency" "ReportFrequency" NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "hour" INTEGER NOT NULL DEFAULT 9,
    "minute" INTEGER NOT NULL DEFAULT 0,
    "formats" JSONB NOT NULL,
    "recipients" JSONB NOT NULL,
    "filters" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedReport" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT,
    "requestedById" TEXT,
    "triggerSource" "ReportTriggerSource" NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "status" "ReportRunStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodKey" TEXT NOT NULL,
    "parameters" JSONB,
    "fileName" TEXT,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "errorMessage" TEXT,
    "generatedAt" TIMESTAMP(3),
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketKnowledgeLink" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketKnowledgeLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Macro" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "category" TEXT NOT NULL,
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Macro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "Ticket_categoryId_idx" ON "Ticket"("categoryId");

-- CreateIndex
CREATE INDEX "Ticket_assigneeId_idx" ON "Ticket"("assigneeId");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_priority_idx" ON "Ticket"("priority");

-- CreateIndex
CREATE INDEX "Ticket_teamId_idx" ON "Ticket"("teamId");

-- CreateIndex
CREATE INDEX "Ticket_requestTypeId_idx" ON "Ticket"("requestTypeId");

-- CreateIndex
CREATE INDEX "Ticket_customerId_idx" ON "Ticket"("customerId");

-- CreateIndex
CREATE INDEX "Ticket_customerEmail_idx" ON "Ticket"("customerEmail");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- CreateIndex
CREATE INDEX "Ticket_status_createdAt_idx" ON "Ticket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Ticket_assigneeId_status_idx" ON "Ticket"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "Ticket_searchVector_idx" ON "Ticket"("searchVector");

-- CreateIndex
CREATE INDEX "Ticket_mergedIntoId_idx" ON "Ticket"("mergedIntoId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_email_key" ON "Agent"("email");

-- CreateIndex
CREATE INDEX "Agent_isActive_idx" ON "Agent"("isActive");

-- CreateIndex
CREATE INDEX "AgentAbsence_agentId_idx" ON "AgentAbsence"("agentId");

-- CreateIndex
CREATE INDEX "AgentAbsence_startDate_endDate_idx" ON "AgentAbsence"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "AgentAbsence_agentId_startDate_endDate_idx" ON "AgentAbsence"("agentId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_idx" ON "AuditLog"("resourceType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_lastTicketAt_idx" ON "Customer"("lastTicketAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_sortOrder_idx" ON "Category"("sortOrder");

-- CreateIndex
CREATE INDEX "AgentCategory_categoryId_idx" ON "AgentCategory"("categoryId");

-- CreateIndex
CREATE INDEX "Comment_ticketId_idx" ON "Comment"("ticketId");

-- CreateIndex
CREATE INDEX "Comment_ticketId_createdAt_idx" ON "Comment"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Attachment_ticketId_idx" ON "Attachment"("ticketId");

-- CreateIndex
CREATE INDEX "Attachment_commentId_idx" ON "Attachment"("commentId");

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
CREATE INDEX "GitLink_ticketId_idx" ON "GitLink"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "GitLink_provider_repoFullName_issueNumber_key" ON "GitLink"("provider", "repoFullName", "issueNumber");

-- CreateIndex
CREATE INDEX "TicketTransfer_ticketId_idx" ON "TicketTransfer"("ticketId");

-- CreateIndex
CREATE INDEX "TicketTransfer_fromAgentId_idx" ON "TicketTransfer"("fromAgentId");

-- CreateIndex
CREATE INDEX "TicketTransfer_toAgentId_idx" ON "TicketTransfer"("toAgentId");

-- CreateIndex
CREATE INDEX "ResponseTemplate_categoryId_idx" ON "ResponseTemplate"("categoryId");

-- CreateIndex
CREATE INDEX "ResponseTemplate_requestTypeId_idx" ON "ResponseTemplate"("requestTypeId");

-- CreateIndex
CREATE INDEX "ResponseTemplate_createdById_idx" ON "ResponseTemplate"("createdById");

-- CreateIndex
CREATE INDEX "ResponseTemplate_sortOrder_idx" ON "ResponseTemplate"("sortOrder");

-- CreateIndex
CREATE INDEX "TicketActivity_ticketId_idx" ON "TicketActivity"("ticketId");

-- CreateIndex
CREATE INDEX "TicketActivity_actorId_idx" ON "TicketActivity"("actorId");

-- CreateIndex
CREATE INDEX "TicketActivity_action_idx" ON "TicketActivity"("action");

-- CreateIndex
CREATE UNIQUE INDEX "GitProviderCredential_provider_key" ON "GitProviderCredential"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSetting_key_key" ON "NotificationSetting"("key");

-- CreateIndex
CREATE INDEX "EmailDelivery_status_nextRetryAt_idx" ON "EmailDelivery"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "EmailDelivery_category_status_nextRetryAt_idx" ON "EmailDelivery"("category", "status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "EmailDelivery_ticketId_idx" ON "EmailDelivery"("ticketId");

-- CreateIndex
CREATE INDEX "EmailDelivery_dedupeKey_idx" ON "EmailDelivery"("dedupeKey");

-- CreateIndex
CREATE INDEX "EmailDelivery_messageId_idx" ON "EmailDelivery"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "SAMLProvider_domain_key" ON "SAMLProvider"("domain");

-- CreateIndex
CREATE INDEX "SAMLProvider_domain_idx" ON "SAMLProvider"("domain");

-- CreateIndex
CREATE INDEX "SAMLProvider_isActive_idx" ON "SAMLProvider"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE INDEX "Team_isActive_idx" ON "Team"("isActive");

-- CreateIndex
CREATE INDEX "TeamMember_agentId_idx" ON "TeamMember"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestType_name_key" ON "RequestType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RequestType_categoryId_key" ON "RequestType"("categoryId");

-- CreateIndex
CREATE INDEX "RequestType_isActive_idx" ON "RequestType"("isActive");

-- CreateIndex
CREATE INDEX "RequestType_sortOrder_idx" ON "RequestType"("sortOrder");

-- CreateIndex
CREATE INDEX "RequestType_categoryId_idx" ON "RequestType"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_key_key" ON "CustomFieldDefinition"("key");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_isActive_idx" ON "CustomFieldDefinition"("isActive");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_sortOrder_idx" ON "CustomFieldDefinition"("sortOrder");

-- CreateIndex
CREATE INDEX "CustomFieldValue_ticketId_idx" ON "CustomFieldValue"("ticketId");

-- CreateIndex
CREATE INDEX "CustomFieldValue_fieldId_idx" ON "CustomFieldValue"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_ticketId_fieldId_key" ON "CustomFieldValue"("ticketId", "fieldId");

-- CreateIndex
CREATE INDEX "SLAPolicy_isActive_idx" ON "SLAPolicy"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SLAPolicy_priority_isActive_key" ON "SLAPolicy"("priority", "isActive");

-- CreateIndex
CREATE INDEX "SLAClock_ticketId_idx" ON "SLAClock"("ticketId");

-- CreateIndex
CREATE INDEX "SLAClock_policyId_idx" ON "SLAClock"("policyId");

-- CreateIndex
CREATE INDEX "SLAClock_status_idx" ON "SLAClock"("status");

-- CreateIndex
CREATE INDEX "SLAClock_deadlineAt_idx" ON "SLAClock"("deadlineAt");

-- CreateIndex
CREATE INDEX "BusinessCalendar_isActive_idx" ON "BusinessCalendar"("isActive");

-- CreateIndex
CREATE INDEX "Holiday_calendarId_idx" ON "Holiday"("calendarId");

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "EmailThreadMapping_messageId_key" ON "EmailThreadMapping"("messageId");

-- CreateIndex
CREATE INDEX "EmailThreadMapping_ticketId_idx" ON "EmailThreadMapping"("ticketId");

-- CreateIndex
CREATE INDEX "EmailThreadMapping_messageId_idx" ON "EmailThreadMapping"("messageId");

-- CreateIndex
CREATE INDEX "EmailThreadMapping_inReplyTo_idx" ON "EmailThreadMapping"("inReplyTo");

-- CreateIndex
CREATE INDEX "EmailThreadMapping_isProcessed_idx" ON "EmailThreadMapping"("isProcessed");

-- CreateIndex
CREATE INDEX "EmailThreadMapping_receivedAt_idx" ON "EmailThreadMapping"("receivedAt");

-- CreateIndex
CREATE INDEX "GitEvent_ticketId_idx" ON "GitEvent"("ticketId");

-- CreateIndex
CREATE INDEX "GitEvent_provider_idx" ON "GitEvent"("provider");

-- CreateIndex
CREATE INDEX "GitEvent_eventType_idx" ON "GitEvent"("eventType");

-- CreateIndex
CREATE INDEX "GitEvent_occurredAt_idx" ON "GitEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "SavedFilter_createdById_idx" ON "SavedFilter"("createdById");

-- CreateIndex
CREATE INDEX "SavedFilter_isShared_idx" ON "SavedFilter"("isShared");

-- CreateIndex
CREATE INDEX "GitOperationQueue_status_idx" ON "GitOperationQueue"("status");

-- CreateIndex
CREATE INDEX "GitOperationQueue_retryCount_idx" ON "GitOperationQueue"("retryCount");

-- CreateIndex
CREATE INDEX "GitOperationQueue_createdAt_idx" ON "GitOperationQueue"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PublicApiKey_keyPrefix_key" ON "PublicApiKey"("keyPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "PublicApiKey_keyHash_key" ON "PublicApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "PublicApiKey_isActive_createdAt_idx" ON "PublicApiKey"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "PublicApiKey_createdById_idx" ON "PublicApiKey"("createdById");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_isActive_createdAt_idx" ON "WebhookEndpoint"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_createdById_idx" ON "WebhookEndpoint"("createdById");

-- CreateIndex
CREATE INDEX "WebhookDeliveryLog_endpointId_createdAt_idx" ON "WebhookDeliveryLog"("endpointId", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookDeliveryLog_event_createdAt_idx" ON "WebhookDeliveryLog"("event", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatWidgetSettings_widgetKey_key" ON "ChatWidgetSettings"("widgetKey");

-- CreateIndex
CREATE UNIQUE INDEX "ChatWidgetProfile_widgetKey_key" ON "ChatWidgetProfile"("widgetKey");

-- CreateIndex
CREATE INDEX "ChatWidgetProfile_enabled_isDefault_idx" ON "ChatWidgetProfile"("enabled", "isDefault");

-- CreateIndex
CREATE INDEX "TicketMerge_sourceTicketId_idx" ON "TicketMerge"("sourceTicketId");

-- CreateIndex
CREATE INDEX "TicketMerge_targetTicketId_idx" ON "TicketMerge"("targetTicketId");

-- CreateIndex
CREATE INDEX "TicketMerge_mergedAt_idx" ON "TicketMerge"("mergedAt");

-- CreateIndex
CREATE INDEX "TimeEntry_ticketId_idx" ON "TimeEntry"("ticketId");

-- CreateIndex
CREATE INDEX "TimeEntry_agentId_idx" ON "TimeEntry"("agentId");

-- CreateIndex
CREATE INDEX "TimeEntry_startTime_idx" ON "TimeEntry"("startTime");

-- CreateIndex
CREATE INDEX "AutomationRule_isActive_idx" ON "AutomationRule"("isActive");

-- CreateIndex
CREATE INDEX "AutomationRule_priority_idx" ON "AutomationRule"("priority");

-- CreateIndex
CREATE INDEX "AutomationRule_triggerOn_idx" ON "AutomationRule"("triggerOn");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSatisfaction_ticketId_key" ON "CustomerSatisfaction"("ticketId");

-- CreateIndex
CREATE INDEX "CustomerSatisfaction_ticketId_idx" ON "CustomerSatisfaction"("ticketId");

-- CreateIndex
CREATE INDEX "CustomerSatisfaction_customerId_idx" ON "CustomerSatisfaction"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeCategory_name_key" ON "KnowledgeCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeCategory_slug_key" ON "KnowledgeCategory"("slug");

-- CreateIndex
CREATE INDEX "KnowledgeCategory_sortOrder_isActive_idx" ON "KnowledgeCategory"("sortOrder", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeArticle_slug_key" ON "KnowledgeArticle"("slug");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_categoryId_idx" ON "KnowledgeArticle"("categoryId");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_authorId_idx" ON "KnowledgeArticle"("authorId");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_lastEditedById_idx" ON "KnowledgeArticle"("lastEditedById");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_isPublished_idx" ON "KnowledgeArticle"("isPublished");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_isPublished_isPublic_idx" ON "KnowledgeArticle"("isPublished", "isPublic");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_viewCount_idx" ON "KnowledgeArticle"("viewCount");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_publishedAt_idx" ON "KnowledgeArticle"("publishedAt");

-- CreateIndex
CREATE INDEX "KnowledgeArticleFeedback_articleId_wasHelpful_idx" ON "KnowledgeArticleFeedback"("articleId", "wasHelpful");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeArticleFeedback_articleId_sessionToken_key" ON "KnowledgeArticleFeedback"("articleId", "sessionToken");

-- CreateIndex
CREATE INDEX "TicketPresence_ticketId_lastSeenAt_idx" ON "TicketPresence"("ticketId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "TicketPresence_agentId_lastSeenAt_idx" ON "TicketPresence"("agentId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPresence_ticketId_agentId_key" ON "TicketPresence"("ticketId", "agentId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketCommentLock_ticketId_key" ON "TicketCommentLock"("ticketId");

-- CreateIndex
CREATE INDEX "TicketCommentLock_agentId_expiresAt_idx" ON "TicketCommentLock"("agentId", "expiresAt");

-- CreateIndex
CREATE INDEX "TicketCommentLock_expiresAt_idx" ON "TicketCommentLock"("expiresAt");

-- CreateIndex
CREATE INDEX "ReportSchedule_createdById_idx" ON "ReportSchedule"("createdById");

-- CreateIndex
CREATE INDEX "ReportSchedule_isActive_frequency_idx" ON "ReportSchedule"("isActive", "frequency");

-- CreateIndex
CREATE INDEX "GeneratedReport_status_createdAt_idx" ON "GeneratedReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedReport_scheduleId_createdAt_idx" ON "GeneratedReport"("scheduleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedReport_scheduleId_reportType_format_periodKey_key" ON "GeneratedReport"("scheduleId", "reportType", "format", "periodKey");

-- CreateIndex
CREATE INDEX "TicketKnowledgeLink_articleId_idx" ON "TicketKnowledgeLink"("articleId");

-- CreateIndex
CREATE INDEX "TicketKnowledgeLink_agentId_idx" ON "TicketKnowledgeLink"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketKnowledgeLink_ticketId_articleId_key" ON "TicketKnowledgeLink"("ticketId", "articleId");

-- CreateIndex
CREATE INDEX "Macro_createdById_idx" ON "Macro"("createdById");

-- CreateIndex
CREATE INDEX "Macro_shortcut_idx" ON "Macro"("shortcut");

-- CreateIndex
CREATE INDEX "Macro_isPersonal_idx" ON "Macro"("isPersonal");

-- CreateIndex
CREATE INDEX "Macro_category_idx" ON "Macro"("category");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "RequestType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAbsence" ADD CONSTRAINT "AgentAbsence_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAbsence" ADD CONSTRAINT "AgentAbsence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCategory" ADD CONSTRAINT "AgentCategory_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCategory" ADD CONSTRAINT "AgentCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatEvent" ADD CONSTRAINT "ChatEvent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatEvent" ADD CONSTRAINT "ChatEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitLink" ADD CONSTRAINT "GitLink_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTransfer" ADD CONSTRAINT "TicketTransfer_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTransfer" ADD CONSTRAINT "TicketTransfer_fromAgentId_fkey" FOREIGN KEY ("fromAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTransfer" ADD CONSTRAINT "TicketTransfer_toAgentId_fkey" FOREIGN KEY ("toAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseTemplate" ADD CONSTRAINT "ResponseTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseTemplate" ADD CONSTRAINT "ResponseTemplate_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "RequestType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseTemplate" ADD CONSTRAINT "ResponseTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestType" ADD CONSTRAINT "RequestType_defaultTeamId_fkey" FOREIGN KEY ("defaultTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestType" ADD CONSTRAINT "RequestType_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLAClock" ADD CONSTRAINT "SLAClock_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLAClock" ADD CONSTRAINT "SLAClock_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "SLAPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "BusinessCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitEvent" ADD CONSTRAINT "GitEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicApiKey" ADD CONSTRAINT "PublicApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDeliveryLog" ADD CONSTRAINT "WebhookDeliveryLog_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMerge" ADD CONSTRAINT "TicketMerge_sourceTicketId_fkey" FOREIGN KEY ("sourceTicketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMerge" ADD CONSTRAINT "TicketMerge_targetTicketId_fkey" FOREIGN KEY ("targetTicketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSatisfaction" ADD CONSTRAINT "CustomerSatisfaction_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "KnowledgeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticleFeedback" ADD CONSTRAINT "KnowledgeArticleFeedback_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KnowledgeArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPresence" ADD CONSTRAINT "TicketPresence_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPresence" ADD CONSTRAINT "TicketPresence_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCommentLock" ADD CONSTRAINT "TicketCommentLock_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCommentLock" ADD CONSTRAINT "TicketCommentLock_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ReportSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketKnowledgeLink" ADD CONSTRAINT "TicketKnowledgeLink_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketKnowledgeLink" ADD CONSTRAINT "TicketKnowledgeLink_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KnowledgeArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketKnowledgeLink" ADD CONSTRAINT "TicketKnowledgeLink_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Macro" ADD CONSTRAINT "Macro_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
