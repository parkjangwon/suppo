import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { BusinessHoursForm } from "@/components/admin/business-hours-form";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";

export const metadata: Metadata = {
  title: "영업시간 설정 | Suppo",
};

export default async function BusinessHoursSettingsPage() {
  const copy = getAdminCopy((await cookies()).get("suppo-admin-locale")?.value);
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <AdminOnlyPageState
        title={copy.settingsBusinessHours}
        description={copy.settingsBusinessHoursAdminOnly}
      />
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{copy.settingsBusinessHours}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {copy.settingsBusinessHoursDesc}
        </p>
      </div>

      <BusinessHoursForm />
    </div>
  );
}
