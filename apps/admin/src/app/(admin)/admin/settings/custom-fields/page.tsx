import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { CustomFieldList } from "@/components/admin/custom-field-list";
import { CustomFieldDialog } from "@/components/admin/custom-field-dialog";

export const metadata: Metadata = {
  title: "커스텀 필드 관리 | Crinity",
};

export default async function CustomFieldsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <AdminOnlyPageState
        title="커스텀 필드 관리"
        description="티켓 스키마를 바꾸는 커스텀 필드 설정은 관리자만 변경할 수 있습니다."
      />
    );
  }

  const customFields = await prisma.customFieldDefinition.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">커스텀 필드 관리</h1>
          <p className="text-muted-foreground text-sm mt-1">
            티켓에 추가 정보를 저장하는 사용자 정의 필드를 관리합니다.
          </p>
        </div>
        <CustomFieldDialog />
      </div>

      <CustomFieldList fields={customFields} />
    </div>
  );
}
