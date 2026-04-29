"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@suppo/ui/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationNavProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export function PaginationNav({ page, totalPages, totalCount, pageSize }: PaginationNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const goTo = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p === 1) {
      params.delete("page");
    } else {
      params.set("page", String(p));
    }
    router.push(`?${params.toString()}`);
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  // Show at most 7 page buttons: always include first, last, and current +/- 2.
  const pageNums = buildPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-sm text-muted-foreground">
        총 {totalCount.toLocaleString()}건 중 {start}-{end}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          aria-label="이전 페이지"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pageNums.map((n, i) =>
          n === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground select-none">
              ...
            </span>
          ) : (
            <Button
              key={n}
              variant={n === page ? "default" : "outline"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => goTo(n as number)}
            >
              {n}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages}
          aria-label="다음 페이지"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [];
  const add = (n: number) => {
    if (!pages.includes(n)) pages.push(n);
  };

  add(1);
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) add(i);
  if (current < total - 2) pages.push("...");
  add(total);

  return pages;
}
