-- Add homepage and admin panel title fields to SystemBranding

ALTER TABLE "SystemBranding" 
ADD COLUMN "homepageTitle" TEXT NOT NULL DEFAULT 'Crinity Helpdesk',
ADD COLUMN "homepageSubtitle" TEXT NOT NULL DEFAULT '민원 티켓을 생성하고 상태를 바로 조회할 수 있습니다.',
ADD COLUMN "adminPanelTitle" TEXT NOT NULL DEFAULT 'Crinity Admin';
