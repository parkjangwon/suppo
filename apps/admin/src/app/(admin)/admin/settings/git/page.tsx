import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { GitSettings } from "@/components/admin/git-settings";

export const metadata: Metadata = {
  title: "Git 설정 | Crinity",
};

export default async function GitSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) {
    redirect("/admin/dashboard");
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
        <h1 className="text-2xl font-bold text-foreground">Git 설정</h1>
        <p className="text-sm text-muted-foreground mt-1">
          GitHub/GitLab 연동 설정
        </p>
      </div>

      <GitSettings initialCredentials={credentials} />
    </div>
  );
}
