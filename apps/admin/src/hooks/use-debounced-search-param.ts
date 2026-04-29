"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function useDebouncedSearchParam(value: string, delay = 300) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const currentSearch = searchParams.get("search") ?? "";
    const nextSearch = value.trim();

    if (nextSearch === currentSearch) return;

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextSearch) {
        params.set("search", nextSearch);
      } else {
        params.delete("search");
      }
      params.delete("page");
      const query = params.toString();
      router.replace(query ? `?${query}` : "?");
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [delay, router, searchParams, value]);
}
