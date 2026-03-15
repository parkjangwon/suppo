import { prisma } from "@/lib/db/client";
import { SystemBranding } from "@/lib/branding/context";

const DEFAULT_BRANDING_ID = "default";

const defaultBranding: SystemBranding = {
  companyName: "Crinity",
  logoUrl: undefined,
  faviconUrl: undefined,
  primaryColor: "#0f172a",
  secondaryColor: "#3b82f6",
  homepageTitle: "Crinity Helpdesk",
  homepageSubtitle: "민원 티켓을 생성하고 상태를 바로 조회할 수 있습니다.",
  adminPanelTitle: "Crinity Admin",
  appTitle: "고객 지원 센터",
  welcomeMessage: "무엇을 도와드릴까요?",
  footerText: "© 2024 Crinity. All rights reserved.",
  footerPhone: undefined,
  footerEmail: undefined,
  footerHomepage: undefined,
  footerAddress: undefined,
  showPoweredBy: true,
  customCss: undefined,
};

export async function getSystemBranding(): Promise<SystemBranding> {
  const branding = await prisma.systemBranding.findUnique({
    where: { id: DEFAULT_BRANDING_ID },
  });

  if (!branding) {
    return defaultBranding;
  }

  return {
    companyName: branding.companyName,
    logoUrl: branding.logoUrl || undefined,
    faviconUrl: branding.faviconUrl || undefined,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    homepageTitle: branding.homepageTitle,
    homepageSubtitle: branding.homepageSubtitle,
    adminPanelTitle: branding.adminPanelTitle,
    appTitle: branding.appTitle,
    welcomeMessage: branding.welcomeMessage,
    footerText: branding.footerText,
    footerPhone: branding.footerPhone || undefined,
    footerEmail: branding.footerEmail || undefined,
    footerHomepage: branding.footerHomepage || undefined,
    footerAddress: branding.footerAddress || undefined,
    showPoweredBy: branding.showPoweredBy,
    customCss: branding.customCss || undefined,
  };
}

export async function getBrandingByRequest(): Promise<SystemBranding> {
  return getSystemBranding();
}
