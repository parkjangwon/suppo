import { cookies } from "next/headers";
import { BrandingProvider } from "@crinity/shared/branding/context";
import { getSystemBranding } from "@crinity/shared/db/queries/branding";
import { PublicCopyProvider } from "@crinity/shared/i18n/public-context";
import { getPublicCopy } from "@crinity/shared/i18n/public-copy";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getSystemBranding();

  return {
    title: branding.appTitle,
    icons: branding.faviconUrl ? { icon: branding.faviconUrl } : undefined,
  };
}

export default async function ChatWidgetLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getSystemBranding();
  const locale = (await cookies()).get("crinity-locale")?.value;
  const copy = getPublicCopy(locale);

  return (
    <BrandingProvider branding={branding}>
      <PublicCopyProvider value={copy}>
        <div className="min-h-screen bg-slate-100">
          <header className="bg-white border-b px-4 h-14 flex items-center">
            <a href="/" className="flex items-center gap-2">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.companyName} className="h-6 w-auto" />
              ) : (
                <div 
                  className="h-6 w-6 rounded flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {branding.companyName.charAt(0)}
                </div>
              )}
              <span className="font-semibold" style={{ color: branding.primaryColor }}>
                {branding.companyName}
              </span>
            </a>
          </header>
          <main>{children}</main>
        </div>
      </PublicCopyProvider>
    </BrandingProvider>
  );
}
