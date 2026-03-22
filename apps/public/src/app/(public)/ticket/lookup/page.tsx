import { TicketLookupForm } from "@/components/ticket/ticket-lookup-form";
import { getSystemBranding } from "@crinity/shared/db/queries/branding";
import { Search } from "lucide-react";

export async function generateMetadata() {
  const branding = await getSystemBranding();
  return {
    title: `티켓 조회 | ${branding.companyName}`,
  };
}

export default async function TicketLookupPage() {
  const branding = await getSystemBranding();

  return (
    <div className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-10">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${branding.primaryColor}15` }}
            >
              <Search 
                className="h-8 w-8" 
                style={{ color: branding.primaryColor }}
              />
            </div>
            <h1 
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: branding.primaryColor }}
            >
              티켓 조회
            </h1>
            <p className="text-slate-600">
              티켓 번호와 이메일을 입력하여 문의 내역을 확인하세요.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <TicketLookupForm />
          </div>
        </div>
      </div>
    </div>
  );
}
