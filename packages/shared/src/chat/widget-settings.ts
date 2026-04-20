import { prisma } from "@suppo/db";

export async function ensureChatWidgetSettings() {
  return prisma.chatWidgetSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      widgetKey: "suppo-chat-widget",
      enabled: true,
      buttonImageUrl: null,
      buttonImageFit: "contain",
      buttonBorderColor: null,
      buttonBorderWidth: 0,
      buttonHoverEffect: "lift",
      buttonBadgeText: null,
      buttonBadgeColor: "#ef4444",
      buttonBadgePosition: "top-right",
      showUnreadBadge: true,
      agentResponseTargetMinutes: 5,
      customerFollowupTargetMinutes: 30,
    },
  });
}

export async function getChatWidgetConfig(widgetKey?: string | null) {
  const settings = await ensureChatWidgetSettings();

  if (widgetKey && widgetKey !== settings.widgetKey) {
    const profile = await prisma.chatWidgetProfile.findUnique({
      where: { widgetKey },
    });

    if (profile) {
      return profile;
    }
  }

  return settings;
}
