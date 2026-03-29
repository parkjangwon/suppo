import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFindUniqueSettings, mockFindUniqueProfile, mockUpsertSettings } = vi.hoisted(() => ({
  mockFindUniqueSettings: vi.fn(),
  mockFindUniqueProfile: vi.fn(),
  mockUpsertSettings: vi.fn(),
}));

vi.mock("@crinity/db", () => ({
  prisma: {
    chatWidgetSettings: {
      findUnique: mockFindUniqueSettings,
      upsert: mockUpsertSettings,
    },
    chatWidgetProfile: {
      findUnique: mockFindUniqueProfile,
    },
  },
}));

import { getChatWidgetConfig } from "@crinity/shared/chat/widget-settings";

describe("getChatWidgetConfig", () => {
  beforeEach(() => {
    mockFindUniqueSettings.mockReset();
    mockFindUniqueProfile.mockReset();
    mockUpsertSettings.mockReset();
  });

  it("returns a widget profile when widgetKey matches", async () => {
    mockUpsertSettings.mockResolvedValue({
      id: "default",
      widgetKey: "default-widget",
      buttonLabel: "채팅 상담",
      welcomeTitle: "기본 환영",
      welcomeMessage: "기본 메시지",
      accentColor: "#0f172a",
      position: "bottom-right",
      enabled: true,
      agentResponseTargetMinutes: 5,
      customerFollowupTargetMinutes: 30,
    });
    mockFindUniqueProfile.mockResolvedValue({
      id: "profile-1",
      widgetKey: "brand-a",
      name: "브랜드 A",
      buttonLabel: "브랜드 A 상담",
      welcomeTitle: "브랜드 A 환영",
      welcomeMessage: "브랜드 A 메시지",
      accentColor: "#ef4444",
      position: "bottom-left",
      enabled: true,
      agentResponseTargetMinutes: 3,
      customerFollowupTargetMinutes: 20,
      isDefault: false,
    });

    const config = await getChatWidgetConfig("brand-a");

    expect(config.widgetKey).toBe("brand-a");
    expect(config.buttonLabel).toBe("브랜드 A 상담");
    expect(config.position).toBe("bottom-left");
  });

  it("falls back to default settings when profile is missing", async () => {
    mockUpsertSettings.mockResolvedValue({
      id: "default",
      widgetKey: "default-widget",
      buttonLabel: "채팅 상담",
      welcomeTitle: "기본 환영",
      welcomeMessage: "기본 메시지",
      accentColor: "#0f172a",
      position: "bottom-right",
      enabled: true,
      agentResponseTargetMinutes: 5,
      customerFollowupTargetMinutes: 30,
    });
    mockFindUniqueProfile.mockResolvedValue(null);

    const config = await getChatWidgetConfig("unknown-widget");

    expect(config.widgetKey).toBe("default-widget");
    expect(config.buttonLabel).toBe("채팅 상담");
  });
});
