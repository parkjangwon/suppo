import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { GitSettings } from "@/components/admin/git-settings";
import { getAdminCopy } from "@crinity/shared/i18n/admin-copy";

export const metadata: Metadata = {
  title: "Git 설정 | Crinity",
};

export default async function GitSettingsPage() {
  const copy = getAdminCopy((await cookies()).get("crinity-admin-locale")?.value);
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) {
    return (
      <AdminOnlyPageState
        title={copy.settingsGit}
        description="외부 저장소 연동 정보는 관리자만 관리할 수 있습니다."
      />
    );
  }

  const credentials = await prisma.gitProviderCredential.findMany({
    orderBy: { provider: "asc" },
    select: {
      provider: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{copy.settingsGit}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          GitHub/GitLab 연동 설정
        </p>
      </div>

      <GitSettings initialCredentials={credentials} />
    </div>
  );
}
