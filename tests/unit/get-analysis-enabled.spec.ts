import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindFirst = vi.hoisted(() => vi.fn());

vi.mock("@suppo/db", () => ({
  prisma: {
    lLMSettings: {
      findFirst: mockFindFirst,
    },
  },
}));

import { getAnalysisEnabled } from "../../apps/admin/src/lib/settings/get-analysis-enabled";

describe("getAnalysisEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PHASE;
  });

  it("returns false during production build without querying Prisma", async () => {
    process.env.NEXT_PHASE = "phase-production-build";

    await expect(getAnalysisEnabled()).resolves.toBe(false);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("returns false when the LLMSettings table does not exist yet", async () => {
    const missingTableError = Object.assign(new Error("missing table"), { code: "P2021" });
    mockFindFirst.mockRejectedValue(missingTableError);

    await expect(getAnalysisEnabled()).resolves.toBe(false);
  });

  it("returns the persisted analysisEnabled flag when settings exist", async () => {
    mockFindFirst.mockResolvedValue({ analysisEnabled: true });

    await expect(getAnalysisEnabled()).resolves.toBe(true);
  });
});
