"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@suppo/ui/components/ui/button";
import { getTicketQueuePresets, type TicketQueueFilter } from "@/lib/tickets/ticket-queue-presets";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { copyText } from "@/lib/i18n/admin-copy-utils";

interface TicketQueueBarProps {
  currentAgentId?: string;
}

export function TicketQueueBar({ currentAgentId }: TicketQueueBarProps) {
  const copy = useAdminCopy();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const presets = useMemo(() => getTicketQueuePresets(currentAgentId), [currentAgentId]);

  function applyQueue(filter: TicketQueueFilter) {
    const params = new URLSearchParams();

    Object.entries(filter).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => {
        const isActive = Object.entries(preset.filter).every(
          ([key, value]) => !value || searchParams.get(key) === value
        );

        return (
          <Button
            key={preset.key}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => applyQueue(preset.filter)}
            title={copyText(copy, preset.descriptionKey, preset.description)}
          >
            {copyText(copy, preset.labelKey, preset.label)}
          </Button>
        );
      })}
    </div>
  );
}
