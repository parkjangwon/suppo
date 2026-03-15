import { AdminShell } from "@/components/app/admin-shell";
import { BrandingProvider } from "@/lib/branding/context";
import { getSystemBranding } from "@/lib/db/queries/branding";

export default async function SettingsLayout({
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
