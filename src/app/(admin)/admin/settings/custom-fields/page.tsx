import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
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
    redirect("/admin/tickets");
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
