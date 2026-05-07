import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { CustomFieldList } from "@/components/admin/custom-field-list";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";

export const metadata: Metadata = {
  title: "커스텀 필드 관리 | Suppo",
};

export default async function CustomFieldsPage() {
  const copy = getAdminCopy((await cookies()).get("suppo-admin-locale")?.value);
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <AdminOnlyPageState
        title={copy.settingsCustomFields}
        description={copy.settingsCustomFieldsAdminOnly}
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
          <h1 className="text-2xl font-bold">{copy.settingsCustomFields}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {copy.settingsCustomFieldsDesc}
          </p>
        </div>
      </div>

      <CustomFieldList fields={customFields} />
    </div>
  );
}
