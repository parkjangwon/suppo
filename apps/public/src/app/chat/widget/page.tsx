import { getChatWidgetConfig } from "@crinity/shared/chat/widget-settings";

import { ChatWidgetShell } from "@/components/chat/chat-widget-shell";

export const dynamic = "force-dynamic";

export default async function ChatWidgetPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const widgetKey = typeof params.widgetKey === "string" ? params.widgetKey : undefined;
  const settings = await getChatWidgetConfig(widgetKey);

  return (
    <ChatWidgetShell
      settings={{
        widgetKey: settings.widgetKey,
        welcomeTitle: settings.welcomeTitle,
        welcomeMessage: settings.welcomeMessage,
        accentColor: settings.accentColor,
      }}
    />
  );
}
