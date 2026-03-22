"use client";

import { useEffect, useState } from "react";
import { DatePreset, OverviewResponse } from "@/lib/db/queries/admin-analytics/contracts";

export function useAnalyticsData(preset: DatePreset) {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/analytics/overview?preset=${preset}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [preset]);

  return { data, isLoading };
}
