import { PublicShell } from "@/components/app/public-shell";
import { BrandingProvider } from "@/lib/branding/context";
import { getSystemBranding } from "@/lib/db/queries/branding";
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

  return (
    <BrandingProvider branding={branding}>
      <PublicShell>{children}</PublicShell>
    </BrandingProvider>
  );
}
