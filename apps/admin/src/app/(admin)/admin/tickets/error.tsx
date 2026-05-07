"use client";

import { useEffect } from "react";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { copyText } from "@/lib/i18n/admin-copy-utils";

interface ErrorBoundaryProps {
  error: globalThis.Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({
  error,
  reset
}: ErrorBoundaryProps) {
  const copy = useAdminCopy();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-2xl font-bold mb-4">{copyText(copy, "errorSomethingWrong", "오류가 발생했습니다!")}</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        {copyText(copy, "errorTryAgain", "다시 시도")}
      </button>
    </div>
  );
}
