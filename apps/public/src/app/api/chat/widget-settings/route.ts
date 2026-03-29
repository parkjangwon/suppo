import { getChatWidgetConfig } from "@crinity/shared/chat/widget-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const widgetKey = searchParams.get("widgetKey");
  const settings = await getChatWidgetConfig(widgetKey);

  return Response.json(
    {
      widgetKey: settings.widgetKey,
      enabled: settings.enabled,
      buttonLabel: settings.buttonLabel,
      buttonImageUrl: settings.buttonImageUrl,
      buttonImageFit: settings.buttonImageFit,
      buttonBorderColor: settings.buttonBorderColor,
      buttonBorderWidth: settings.buttonBorderWidth,
      buttonHoverEffect: settings.buttonHoverEffect,
      buttonBadgeText: settings.buttonBadgeText,
      buttonBadgeColor: settings.buttonBadgeColor,
      buttonBadgePosition: settings.buttonBadgePosition,
      showUnreadBadge: settings.showUnreadBadge,
      buttonSize: settings.buttonSize,
      buttonShape: settings.buttonShape,
      buttonShadow: settings.buttonShadow,
      welcomeTitle: settings.welcomeTitle,
      welcomeMessage: settings.welcomeMessage,
      accentColor: settings.accentColor,
      position: settings.position,
      agentResponseTargetMinutes: settings.agentResponseTargetMinutes,
      customerFollowupTargetMinutes: settings.customerFollowupTargetMinutes,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    }
  );
}
