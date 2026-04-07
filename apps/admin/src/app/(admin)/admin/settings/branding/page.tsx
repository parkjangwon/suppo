import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { BrandingForm } from "@/components/admin/branding-form";
import { getAdminCopy } from "@crinity/shared/i18n/admin-copy";

export const metadata: Metadata = {
  title: "브랜딩 설정 | Crinity",
};

export default async function BrandingSettingsPage() {
  const copy = getAdminCopy((await cookies()).get("crinity-admin-locale")?.value);
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <AdminOnlyPageState
        title={copy.settingsBranding}
        description="서비스 로고와 고객 포털 브랜딩 변경은 관리자만 수행할 수 있습니다."
      />
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{copy.settingsBranding}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          고객 지원 포털의 로고, 색상, 텍스트를 커스터마이징할 수 있습니다.
        </p>
      </div>

      <BrandingForm />
    </div>
  );
}
