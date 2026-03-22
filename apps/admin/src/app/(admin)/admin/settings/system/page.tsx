import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SystemManagement } from "@/components/admin/system-management";

export const metadata: Metadata = {
  title: "시스템 관리 | Crinity",
};

export default async function SystemSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">시스템 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          데이터 백업, 복구, 시스템 초기화를 관리합니다.
        </p>
      </div>
      <SystemManagement />
    </div>
  );
}
