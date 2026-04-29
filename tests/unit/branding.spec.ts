import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockGetCache = vi.hoisted(() => vi.fn());
const mockSetCache = vi.hoisted(() => vi.fn());

vi.mock("@suppo/db", () => ({
  prisma: {
    systemBranding: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("../../packages/shared/src/cache/redis", () => ({
  getCache: mockGetCache,
  setCache: mockSetCache,
}));

import { getSystemBranding } from "../../packages/shared/src/db/queries/branding";

describe("getSystemBranding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCache.mockResolvedValue(null);
    mockSetCache.mockResolvedValue(undefined);
    delete process.env.NEXT_PHASE;
  });

  it("returns default branding during production build without querying Prisma", async () => {
    process.env.NEXT_PHASE = "phase-production-build";

    const branding = await getSystemBranding();

    expect(branding.companyName).toBe("Suppo");
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns default branding when the SystemBranding table does not exist yet", async () => {
    const missingTableError = Object.assign(new Error("missing table"), { code: "P2021" });
    mockFindUnique.mockRejectedValue(missingTableError);

    const branding = await getSystemBranding();

    expect(branding.companyName).toBe("Suppo");
    expect(branding.adminPanelTitle).toBe("Suppo Admin");
    expect(branding.knowledgeEnabled).toBe(true);
    expect(mockSetCache).toHaveBeenCalled();
  });

  it("normalizes legacy branding upload URLs to the public branding asset API", async () => {
    mockFindUnique.mockResolvedValue({
      companyName: "Suppo",
      logoUrl: "/uploads/branding/logo file.png",
      faviconUrl: "/uploads/branding/favicon.ico",
      primaryColor: "#0f172a",
      secondaryColor: "#3b82f6",
      homepageTitle: "Suppo",
      homepageSubtitle: "민원 티켓을 생성하고 상태를 바로 조회할 수 있습니다.",
      adminPanelTitle: "Suppo Admin",
      appTitle: "고객 지원 센터",
      welcomeMessage: "무엇을 도와드릴까요?",
      footerText: "© 2026 parkjangwon. All rights reserved.",
      footerPhone: null,
      footerEmail: null,
      footerHomepage: null,
      footerAddress: null,
      showPoweredBy: true,
      knowledgeEnabled: true,
      customCss: null,
    });

    const branding = await getSystemBranding();

    expect(branding.logoUrl).toBe("/api/branding-assets/logo%20file.png");
    expect(branding.faviconUrl).toBe("/api/branding-assets/favicon.ico");
  });
});
