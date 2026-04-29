import { prisma } from "@suppo/db";
import { SystemBranding } from "@suppo/shared/branding/context";
import { getCache, setCache } from "../../cache/redis";

const DEFAULT_BRANDING_ID = "default";
const BRANDING_CACHE_KEY = "branding:system";
const BRANDING_CACHE_TTL = 1800;

const defaultBranding: SystemBranding = {
  companyName: "Suppo",
  logoUrl: undefined,
  faviconUrl: undefined,
  primaryColor: "#0f172a",
  secondaryColor: "#3b82f6",
  homepageTitle: "Suppo",
  homepageSubtitle: "민원 티켓을 생성하고 상태를 바로 조회할 수 있습니다.",
  adminPanelTitle: "Suppo Admin",
  appTitle: "고객 지원 센터",
  welcomeMessage: "무엇을 도와드릴까요?",
  footerText: "© 2026 parkjangwon. All rights reserved.",
  footerPhone: undefined,
  footerEmail: undefined,
  footerHomepage: undefined,
  footerAddress: undefined,
  showPoweredBy: true,
  knowledgeEnabled: true,
  customCss: undefined,
};

function normalizeBrandingAssetUrl(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  const legacyPrefix = "/uploads/branding/";
  if (url.startsWith(legacyPrefix)) {
    return `/api/branding-assets/${encodeURIComponent(url.slice(legacyPrefix.length))}`;
  }

  return url;
}

export async function getSystemBranding(): Promise<SystemBranding> {
  const cached = await getCache<SystemBranding>(BRANDING_CACHE_KEY);
  if (cached) return cached;

  if (process.env.NEXT_PHASE === "phase-production-build") {
    await setCache(BRANDING_CACHE_KEY, defaultBranding, { ttl: BRANDING_CACHE_TTL });
    return defaultBranding;
  }

  let branding = null;
  try {
    branding = await prisma.systemBranding.findUnique({
      where: { id: DEFAULT_BRANDING_ID },
    });
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2021")) {
      throw error;
    }
  }

  const result = branding ? {
    companyName: branding.companyName,
    logoUrl: normalizeBrandingAssetUrl(branding.logoUrl),
    faviconUrl: normalizeBrandingAssetUrl(branding.faviconUrl),
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
