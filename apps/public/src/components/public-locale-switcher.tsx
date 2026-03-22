"use client";

import { Globe } from "lucide-react";
import { Button } from "@crinity/ui/components/ui/button";
import { usePublicCopy } from "@crinity/shared/i18n/public-context";

export function PublicLocaleSwitcher() {
  const copy = usePublicCopy();

  function setLocale(locale: "ko" | "en") {
    document.cookie = `crinity-locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-1">
      <Globe className="h-4 w-4 text-slate-500" />
      <Button variant={copy.locale === "ko" ? "secondary" : "ghost"} size="sm" onClick={() => setLocale("ko")}>
        KO
      </Button>
      <Button variant={copy.locale === "en" ? "secondary" : "ghost"} size="sm" onClick={() => setLocale("en")}>
        EN
      </Button>
    </div>
  );
}
