import { TicketForm } from "@/components/ticket/ticket-form";
import { listCategories } from "@/lib/db/queries/categories";
import { getSystemBranding } from "@/lib/db/queries/branding";

export async function generateMetadata() {
  const branding = await getSystemBranding();
  return {
    title: `티켓 작성 | ${branding.companyName}`,
  };
}

export default async function NewTicketPage() {
  const branding = await getSystemBranding();
  
  let categories = [];
  try {
    categories = await listCategories();
  } catch (error) {
    console.error("Failed to load categories:", error);
  }

  return (
    <div className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h1 
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: branding.primaryColor }}
            >
              문의하기
            </h1>
            <p className="text-slate-600">
              궁금한 점이나 문제가 있으신가요? 아래 양식을 작성해 주시면 신속하게 답변해 드리겠습니다.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <TicketForm categories={categories} />
          </div>
        </div>
      </div>
    </div>
  );
}
