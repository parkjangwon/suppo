-- AlterEnum
ALTER TYPE "AuthProvider" ADD VALUE 'SAML';

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
CREATE TABLE "TenantBranding" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyName" TEXT NOT NULL,
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

    CONSTRAINT "TenantBranding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SAMLProvider_domain_key" ON "SAMLProvider"("domain");

-- CreateIndex
CREATE INDEX "SAMLProvider_domain_idx" ON "SAMLProvider"("domain");

-- CreateIndex
CREATE INDEX "SAMLProvider_isActive_idx" ON "SAMLProvider"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TenantBranding_domain_key" ON "TenantBranding"("domain");

-- CreateIndex
CREATE INDEX "TenantBranding_domain_idx" ON "TenantBranding"("domain");

-- CreateIndex
CREATE INDEX "TenantBranding_isActive_idx" ON "TenantBranding"("isActive");
