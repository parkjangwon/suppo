import { TicketForm } from "@/components/ticket/ticket-form";
import { listCategories } from "@/lib/db/queries/categories";

export const metadata = {
  title: "새 티켓 생성 | Crinity Ticket",
  description: "새로운 문의를 등록합니다.",
};

export default async function NewTicketPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let categories: any[] = [];
  try {
    categories = await listCategories();
  } catch (error) {
    console.error("Failed to load categories:", error);
    if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
      categories = [
        { id: "cat-1", name: "버그 신고", description: null, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
        { id: "cat-2", name: "기능 제안", description: null, sortOrder: 2, createdAt: new Date(), updatedAt: new Date() },
      ];
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">문의하기</h1>
          <p className="mt-2 text-gray-600">
            궁금한 점이나 문제가 있으신가요? 아래 양식을 작성해 주시면 신속하게 답변해 드리겠습니다.
          </p>
        </div>

        <TicketForm categories={categories} />
      </div>
    </div>
  );
}
