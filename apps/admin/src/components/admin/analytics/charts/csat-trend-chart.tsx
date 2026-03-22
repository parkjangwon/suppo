"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CSATBucket } from "@/lib/db/queries/admin-analytics/contracts";

interface CSATTrendChartProps {
  data: CSATBucket[];
}

export function CSATTrendChart({ data }: CSATTrendChartProps) {
  const chartData = data.map((d) => ({
    date: d.bucket,
    rating: Number(d.avgRating.toFixed(1)),
    count: d.responseCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSAT 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value) => [value, "평균 평점"]}
                labelFormatter={(label) => `날짜: ${label}`}
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
