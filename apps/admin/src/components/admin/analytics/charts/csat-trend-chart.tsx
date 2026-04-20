"use client";

import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CSATBucket } from "@/lib/db/queries/admin-analytics/contracts";
import { copyText } from "@/lib/i18n/admin-copy-utils";

interface CSATTrendChartProps {
  data: CSATBucket[];
}

export function CSATTrendChart({ data }: CSATTrendChartProps) {
  const copy = useAdminCopy();
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy, key, copy.locale === "en" ? (en ?? ko) : ko);
  const chartData = data.map((d) => ({
    date: d.bucket,
    rating: Number(d.avgRating.toFixed(1)),
    count: d.responseCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("analyticsCsatTrendTitle", "고객 만족도 추이", "CSAT trend")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value) => [value, t("analyticsAverageRating", "평균 평점", "Average rating")]}
                labelFormatter={(label) => `${t("commonDateLabel", "날짜", "Date")}: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="rating" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: "#3b82f6" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
