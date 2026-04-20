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
});
