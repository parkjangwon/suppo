import { ensureChatWidgetSettings } from "@crinity/shared/chat/widget-settings";

import { ChatWidgetShell } from "@/components/chat/chat-widget-shell";

export const dynamic = "force-dynamic";

export default async function ChatEmbedPage() {
  const settings = await ensureChatWidgetSettings();

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
