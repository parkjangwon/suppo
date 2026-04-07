"use client";

import { useAdminCopy } from "@crinity/shared/i18n/admin-context";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CategoryFrequency } from "@/lib/db/queries/admin-analytics/contracts";
import { copyText } from "@/lib/i18n/admin-copy-utils";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

interface CategoryFrequencyChartProps {
  data: CategoryFrequency[];
}

export function CategoryFrequencyChart({ data }: CategoryFrequencyChartProps) {
  const copy = useAdminCopy();
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy, key, copy.locale === "en" ? (en ?? ko) : ko);
  const chartData = data.slice(0, 8).map((d) => ({
    name: d.categoryName,
    value: d.ticketCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("analyticsCategoryDistributionTitle", "카테고리별 티켓 분포", "Ticket distribution by category")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [copy.locale === "en" ? `${value} tickets` : `${value}건`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
