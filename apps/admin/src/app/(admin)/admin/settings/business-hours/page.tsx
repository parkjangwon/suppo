import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { BusinessHoursForm } from "@/components/admin/business-hours-form";
import { getAdminCopy } from "@crinity/shared/i18n/admin-copy";

export const metadata: Metadata = {
  title: "영업시간 설정 | Crinity",
};

export default async function BusinessHoursSettingsPage() {
  const copy = getAdminCopy((await cookies()).get("crinity-admin-locale")?.value);
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <AdminOnlyPageState
        title={copy.settingsBusinessHours}
        description="영업시간 및 공휴일 설정은 관리자만 변경할 수 있습니다."
      />
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{copy.settingsBusinessHours}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          비즈니스 시간 및 공휴일을 설정하여 SLA 계산에 적용합니다.
        </p>
      </div>

      <BusinessHoursForm />
    </div>
  );
}
