"use client";

import { Globe } from "lucide-react";
import { Button } from "@crinity/ui/components/ui/button";
import { usePublicCopy } from "@crinity/shared/i18n/public-context";
import { useState, useEffect } from "react";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

export function PublicLocaleSwitcher() {
  const copy = usePublicCopy();
  const [clientLocale, setClientLocale] = useState<"ko" | "en">(copy.locale);

  useEffect(() => {
    const cookieLocale = getCookie("crinity-locale");
    if (cookieLocale === "ko" || cookieLocale === "en") {
      setClientLocale(cookieLocale);
    }
  }, []);

  function setLocale(locale: "ko" | "en") {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    
    document.cookie = `crinity-locale=${locale}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    setClientLocale(locale);
    window.location.reload();
  }

  const activeLocale = clientLocale || copy.locale;

  return (
    <div className="flex items-center gap-1">
      <Globe className="h-4 w-4 text-slate-500" />
      <Button 
        variant={activeLocale === "ko" ? "secondary" : "ghost"} 
        size="sm" 
        onClick={() => setLocale("ko")}
        aria-pressed={activeLocale === "ko"}
      >
        KO
      </Button>
      <Button 
        variant={activeLocale === "en" ? "secondary" : "ghost"} 
        size="sm" 
        onClick={() => setLocale("en")}
        aria-pressed={activeLocale === "en"}
      >
        EN
      </Button>
    </div>
  );
}
