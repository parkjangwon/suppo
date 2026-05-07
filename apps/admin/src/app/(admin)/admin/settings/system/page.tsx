import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { SystemManagement } from "@/components/admin/system-management";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";

export const metadata: Metadata = {
  title: "시스템 관리 | Suppo",
};

export default async function SystemSettingsPage() {
  const copy = getAdminCopy((await cookies()).get("suppo-admin-locale")?.value);
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <AdminOnlyPageState
        title={copy.settingsSystem}
        description={copy.settingsSystemAdminOnly}
      />
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{copy.settingsSystem}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {copy.settingsSystemDesc}
        </p>
      </div>
      <SystemManagement />
    </div>
  );
}
