-- Simplify branding from multi-tenant to single system branding

-- Drop old multi-tenant branding table
DROP TABLE IF EXISTS "TenantBranding";

-- Create new single system branding table
CREATE TABLE "SystemBranding" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'Crinity',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0f172a',
    "secondaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "appTitle" TEXT NOT NULL DEFAULT '고객 지원 센터',
    "welcomeMessage" TEXT NOT NULL DEFAULT '무엇을 도와드릴까요?',
    "footerText" TEXT NOT NULL DEFAULT '© 2024 All rights reserved.',
    "footerPhone" TEXT,
    "footerEmail" TEXT,
    "footerHomepage" TEXT,
    "footerAddress" TEXT,
    "showPoweredBy" BOOLEAN NOT NULL DEFAULT true,
    "customCss" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemBranding_pkey" PRIMARY KEY ("id")
);
