"use client";

import { Globe } from "lucide-react";
import { Button } from "@crinity/ui/components/ui/button";
import { usePublicCopy } from "@crinity/shared/i18n/public-context";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function PublicLocaleSwitcher() {
  const copy = usePublicCopy();
  const router = useRouter();
  const [clientLocale, setClientLocale] = useState<"ko" | "en">(copy.locale);
  const [isPending, startTransition] = useTransition();

  async function setLocale(locale: "ko" | "en") {
    if (locale === clientLocale) {
      return;
    }

    const response = await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("locale update failed");
    }

    setClientLocale(locale);
    startTransition(() => {
      router.refresh();
    });
    window.location.reload();
  }

  const activeLocale = clientLocale || copy.locale;

  return (
    <div className="flex items-center gap-1">
      <Globe className="h-4 w-4 text-slate-500" />
      <Button 
        variant={activeLocale === "ko" ? "secondary" : "ghost"} 
        size="sm" 
        onClick={() => void setLocale("ko")}
        aria-pressed={activeLocale === "ko"}
        disabled={isPending}
      >
        KO
      </Button>
      <Button 
        variant={activeLocale === "en" ? "secondary" : "ghost"} 
        size="sm" 
        onClick={() => void setLocale("en")}
        aria-pressed={activeLocale === "en"}
        disabled={isPending}
      >
        EN
      </Button>
    </div>
  );
}
