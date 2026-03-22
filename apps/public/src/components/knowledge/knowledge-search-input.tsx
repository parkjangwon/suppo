"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useRef, useTransition } from "react";
import { Input } from "@crinity/ui/components/ui/input";
import { Button } from "@crinity/ui/components/ui/button";
import { Search, Loader2 } from "lucide-react";

export function KnowledgeSearchInput({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch(formData: FormData) {
    const q = (formData.get("q") as string)?.trim();
    const params = new URLSearchParams(searchParams.toString());

    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }
    // 검색 시 카테고리 필터 유지
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <form action={handleSearch} className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
      <Input
        ref={inputRef}
        name="q"
        defaultValue={defaultValue}
        placeholder="제목, 내용으로 검색..."
        className="pl-12 pr-24 h-14 text-lg"
      />
      <Button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 h-10"
        disabled={isPending}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "검색"}
      </Button>
    </form>
  );
}
