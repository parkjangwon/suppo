import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin-shell";
import { BrandingProvider } from "@crinity/shared/branding/context";
import { getSystemBranding } from "@crinity/shared/db/queries/branding";
import { AdminCopyProvider } from "@crinity/shared/i18n/admin-context";
import { getAdminCopy } from "@crinity/shared/i18n/admin-copy";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getSystemBranding();

  return {
    title: branding.adminPanelTitle,
    icons: branding.faviconUrl ? { icon: branding.faviconUrl } : undefined,
  };
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getSystemBranding();
  const locale = (await cookies()).get("crinity-locale")?.value;
  const copy = getAdminCopy(locale);

  return (
    <BrandingProvider branding={branding}>
      <AdminCopyProvider value={copy}>
        <AdminShell>{children}</AdminShell>
      </AdminCopyProvider>
    </BrandingProvider>
  );
}
