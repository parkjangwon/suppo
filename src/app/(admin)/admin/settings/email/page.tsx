import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EmailSettingsForm } from "@/components/admin/email-settings-form";

export const metadata: Metadata = {
  title: "이메일 연동 | Crinity",
};

export default async function EmailSettingsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">이메일 설정</h1>
        <p className="text-sm text-muted-foreground mt-1">
          SMTP 서버 연동 및 이메일 알림 설정을 관리합니다.
        </p>
      </div>

      <EmailSettingsForm />
    </div>
  );
}
