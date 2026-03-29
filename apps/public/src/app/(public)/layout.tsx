import { cookies } from "next/headers";
import { PublicShell } from "@/components/public-shell";
import { BrandingProvider } from "@crinity/shared/branding/context";
import { getSystemBranding } from "@crinity/shared/db/queries/branding";
import { PublicCopyProvider } from "@crinity/shared/i18n/public-context";
import { getPublicCopy } from "@crinity/shared/i18n/public-copy";
import { getChatWidgetConfig } from "@crinity/shared/chat/widget-settings";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getSystemBranding();

  return {
    title: branding.appTitle,
    icons: branding.faviconUrl ? { icon: branding.faviconUrl } : undefined,
  };
}

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getSystemBranding();
  const locale = (await cookies()).get("crinity-locale")?.value;
  const copy = getPublicCopy(locale);
  const chatSettings = await getChatWidgetConfig();

  return (
    <BrandingProvider branding={branding}>
      <PublicCopyProvider value={copy}>
        <PublicShell
          chatWidgetEnabled={chatSettings.enabled}
          defaultWidgetKey={chatSettings.widgetKey}
        >
          {children}
        </PublicShell>
      </PublicCopyProvider>
    </BrandingProvider>
  );
}
