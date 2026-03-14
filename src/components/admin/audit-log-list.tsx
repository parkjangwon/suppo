"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface AuditLog {
  id: string;
  actorName: string;
  actorEmail: string;
  actorType: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  description: string;
  ipAddress: string | null;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const AUDIT_ACTIONS = [
  "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", 
  "EXPORT", "ASSIGN", "TRANSFER", "STATUS_CHANGE", 
  "PRIORITY_CHANGE", "SETTINGS_CHANGE", "PASSWORD_RESET", 
  "ACTIVATE", "DEACTIVATE"
];

const RESOURCE_TYPES = [
  "Ticket", "Agent", "Customer", "Category", "Team", 
  "RequestType", "SLAPolicy", "BusinessCalendar", 
  "ResponseTemplate", "SystemBranding", "EmailSettings", 
  "LLMSettings", "SAMLProvider"
];

interface AuditLogListProps {
  initialLogs: AuditLog[];
  initialPagination: Pagination;
}

export function AuditLogList({ initialLogs, initialPagination }: AuditLogListProps) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>("ALL");
  const [resourceType, setResourceType] = useState<string>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (search) params.append("search", search);
      if (action !== "ALL") params.append("action", action);
      if (resourceType !== "ALL") params.append("resourceType", resourceType);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch logs");

      const data = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [search, action, resourceType, startDate, endDate]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (action !== "ALL") params.append("action", action);
      if (resourceType !== "ALL") params.append("resourceType", resourceType);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      window.location.href = `/api/admin/audit-logs/export?${params.toString()}`;
    } catch (error) {
      console.error("Error exporting audit logs:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">필터</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="작업자 이름/이메일 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue placeholder="작업 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">모든 작업</SelectItem>
                {AUDIT_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger>
                <SelectValue placeholder="리소스 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">모든 리소스</SelectItem>
                {RESOURCE_TYPES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="시작일"
            />
            
            <div className="flex gap-2">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="종료일"
              />
              <Button type="submit" variant="secondary">
                검색
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          variant="outline" 
          onClick={handleExport}
          disabled={isExporting || logs.length === 0}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          엑셀 다운로드
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">일시</TableHead>
                <TableHead>작업자</TableHead>
                <TableHead>작업</TableHead>
                <TableHead>리소스</TableHead>
                <TableHead className="max-w-[300px]">설명</TableHead>
                <TableHead className="w-[120px]">IP 주소</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    감사 로그가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss", { locale: ko })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{log.actorName}</span>
                        <span className="text-xs text-muted-foreground">{log.actorEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{log.resourceType}</span>
                        {log.resourceId && (
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={log.resourceId}>
                            {log.resourceId}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm" title={log.description}>
                      {log.description}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.ipAddress || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              총 {pagination.total}개 중 {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}개
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="sr-only">이전 페이지</span>
              </Button>
              <div className="text-sm font-medium">
                {pagination.page} / {pagination.totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
                <span className="sr-only">다음 페이지</span>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
