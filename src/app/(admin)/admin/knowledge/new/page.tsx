import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KnowledgeForm } from "@/components/admin/knowledge-form";

export const metadata: Metadata = {
  title: "새 지식 문서 | Crinity",
};

export default async function NewKnowledgePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const categories = await prisma.knowledgeCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">새 지식 문서</h1>

      <Card>
        <CardHeader>
          <CardTitle>문서 작성</CardTitle>
        </CardHeader>
        <CardContent>
          <KnowledgeForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
