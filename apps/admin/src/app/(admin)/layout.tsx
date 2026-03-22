import { AdminShell } from "@/components/admin-shell";
import { BrandingProvider } from "@crinity/shared/branding/context";
import { getSystemBranding } from "@crinity/shared/db/queries/branding";
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

  return (
    <BrandingProvider branding={branding}>
      <AdminShell>{children}</AdminShell>
    </BrandingProvider>
  );
}
