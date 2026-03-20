"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePreset, AgentPerformance, AgentPerformanceResponse } from "@/lib/db/queries/admin-analytics/contracts";

interface AgentPerformanceTableProps {
  preset: DatePreset;
}

export function AgentPerformanceTable({ preset }: AgentPerformanceTableProps) {
  const [data, setData] = useState<AgentPerformanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/analytics/agents?preset=${preset}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch agent performance:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [preset]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">불러오는 중...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>상담원 성과</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>상담원</TableHead>
              <TableHead className="text-right">처리 티켓</TableHead>
              <TableHead className="text-right">오픈 티켓</TableHead>
              <TableHead className="text-right">평균 첫 응답</TableHead>
              <TableHead className="text-right">평균 해결 시간</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.agents.map((agent: AgentPerformance) => (
              <TableRow key={agent.agentId}>
                <TableCell className="font-medium">{agent.agentName}</TableCell>
                <TableCell className="text-right">{agent.ticketsHandled}</TableCell>
                <TableCell className="text-right">{agent.openTickets}</TableCell>
                <TableCell className="text-right">
                  {agent.avgFirstResponseMinutes 
                    ? `${Math.round(agent.avgFirstResponseMinutes)}분` 
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {agent.avgResolutionMinutes 
                    ? `${Math.round(agent.avgResolutionMinutes / 60)}시간` 
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
            {data?.agents.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  데이터가 없습니다
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
