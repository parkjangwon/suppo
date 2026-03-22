import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BrandingForm } from "@/components/admin/branding-form";

export const metadata: Metadata = {
  title: "브랜딩 설정 | Crinity",
};

export default async function BrandingSettingsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">브랜딩 설정</h1>
        <p className="text-sm text-muted-foreground mt-1">
          고객 지원 포털의 로고, 색상, 텍스트를 커스터마이징할 수 있습니다.
        </p>
      </div>

      <BrandingForm />
    </div>
  );
}
