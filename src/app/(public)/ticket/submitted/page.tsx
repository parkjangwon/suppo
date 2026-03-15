import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "티켓 제출 완료 | Crinity Helpdesk",
  description: "문의가 성공적으로 접수되었습니다.",
};

export default async function TicketSubmittedPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const ticketNumber = params.id;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            문의가 접수되었습니다
          </h2>
          
          <p className="text-gray-600 mb-6">
            담당자가 확인 후 신속하게 답변해 드리겠습니다.
          </p>

          {ticketNumber && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">티켓 번호</p>
              <p className="text-xl font-mono font-bold text-blue-600">
                {ticketNumber}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Link
              href="/"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              홈으로 돌아가기
            </Link>
            <Link
              href="/ticket/new"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              새 문의 작성하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
