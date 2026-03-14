import Link from "next/link";

export default function PublicHomePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Crinity Ticket
      </h1>
      <p className="text-sm text-slate-600 sm:text-base">
        민원 티켓을 생성하고 상태를 바로 조회할 수 있습니다.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/tickets/new"
          className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          티켓 작성
        </Link>
        <Link
          href="/tickets/lookup"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-400"
        >
          티켓 조회
        </Link>
      </div>
    </div>
  );
}
