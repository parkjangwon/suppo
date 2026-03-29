-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatWidgetProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "widgetKey" TEXT NOT NULL,
    "buttonLabel" TEXT NOT NULL,
    "buttonImageUrl" TEXT,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ChatWidgetProfile" ("accentColor", "agentResponseTargetMinutes", "buttonImageUrl", "buttonLabel", "createdAt", "customerFollowupTargetMinutes", "enabled", "id", "isDefault", "name", "position", "updatedAt", "welcomeMessage", "welcomeTitle", "widgetKey") SELECT "accentColor", "agentResponseTargetMinutes", "buttonImageUrl", "buttonLabel", "createdAt", "customerFollowupTargetMinutes", "enabled", "id", "isDefault", "name", "position", "updatedAt", "welcomeMessage", "welcomeTitle", "widgetKey" FROM "ChatWidgetProfile";
DROP TABLE "ChatWidgetProfile";
ALTER TABLE "new_ChatWidgetProfile" RENAME TO "ChatWidgetProfile";
CREATE UNIQUE INDEX "ChatWidgetProfile_widgetKey_key" ON "ChatWidgetProfile"("widgetKey");
CREATE INDEX "ChatWidgetProfile_enabled_isDefault_idx" ON "ChatWidgetProfile"("enabled", "isDefault");
CREATE TABLE "new_ChatWidgetSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "widgetKey" TEXT NOT NULL,
    "buttonLabel" TEXT NOT NULL DEFAULT '채팅 상담',
    "buttonImageUrl" TEXT,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ChatWidgetSettings" ("accentColor", "agentResponseTargetMinutes", "buttonImageUrl", "buttonLabel", "createdAt", "customerFollowupTargetMinutes", "enabled", "id", "position", "updatedAt", "welcomeMessage", "welcomeTitle", "widgetKey") SELECT "accentColor", "agentResponseTargetMinutes", "buttonImageUrl", "buttonLabel", "createdAt", "customerFollowupTargetMinutes", "enabled", "id", "position", "updatedAt", "welcomeMessage", "welcomeTitle", "widgetKey" FROM "ChatWidgetSettings";
DROP TABLE "ChatWidgetSettings";
ALTER TABLE "new_ChatWidgetSettings" RENAME TO "ChatWidgetSettings";
CREATE UNIQUE INDEX "ChatWidgetSettings_widgetKey_key" ON "ChatWidgetSettings"("widgetKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
