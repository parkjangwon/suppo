-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SystemBranding" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'Suppo',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0f172a',
    "secondaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "homepageTitle" TEXT NOT NULL DEFAULT 'Suppo Helpdesk',
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SystemBranding" ("adminPanelTitle", "appTitle", "companyName", "createdAt", "customCss", "faviconUrl", "footerAddress", "footerEmail", "footerHomepage", "footerPhone", "footerText", "homepageSubtitle", "homepageTitle", "id", "logoUrl", "primaryColor", "secondaryColor", "showPoweredBy", "updatedAt", "welcomeMessage") SELECT "adminPanelTitle", "appTitle", "companyName", "createdAt", "customCss", "faviconUrl", "footerAddress", "footerEmail", "footerHomepage", "footerPhone", "footerText", "homepageSubtitle", "homepageTitle", "id", "logoUrl", "primaryColor", "secondaryColor", "showPoweredBy", "updatedAt", "welcomeMessage" FROM "SystemBranding";
DROP TABLE "SystemBranding";
ALTER TABLE "new_SystemBranding" RENAME TO "SystemBranding";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
