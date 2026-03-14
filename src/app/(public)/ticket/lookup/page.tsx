import { TicketLookupForm } from "@/components/ticket/ticket-lookup-form";

export default function TicketLookupPage() {
  return (
    <div className="max-w-md mx-auto p-6 mt-12 bg-white rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold mb-6 text-center">티켓 조회</h1>
      <p className="text-gray-500 text-sm text-center mb-8">
        티켓 번호와 이메일을 입력하여 문의 내역을 확인하세요.
      </p>
      <TicketLookupForm />
    </div>
  );
}
