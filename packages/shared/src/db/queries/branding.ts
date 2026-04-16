import { prisma } from "@crinity/db";
import { SystemBranding } from "@crinity/shared/branding/context";
import { getCache, setCache } from "../../cache/redis";

const DEFAULT_BRANDING_ID = "default";
const BRANDING_CACHE_KEY = "branding:system";
const BRANDING_CACHE_TTL = 1800;

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
  footerText: "© 2026 Crinity. All rights reserved.",
  footerPhone: undefined,
  footerEmail: undefined,
  footerHomepage: undefined,
  footerAddress: undefined,
  showPoweredBy: true,
  knowledgeEnabled: true,
  customCss: undefined,
};

export async function getSystemBranding(): Promise<SystemBranding> {
  const cached = await getCache<SystemBranding>(BRANDING_CACHE_KEY);
  if (cached) return cached;

  const branding = await prisma.systemBranding.findUnique({
    where: { id: DEFAULT_BRANDING_ID },
  });

  const result = branding ? {
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
    knowledgeEnabled: branding.knowledgeEnabled,
    customCss: branding.customCss || undefined,
  } : defaultBranding;

  await setCache(BRANDING_CACHE_KEY, result, { ttl: BRANDING_CACHE_TTL });
  return result;
}

export async function getBrandingByRequest(): Promise<SystemBranding> {
  return getSystemBranding();
}
