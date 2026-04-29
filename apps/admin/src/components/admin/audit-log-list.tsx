"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@suppo/ui/components/ui/input";
import { Button } from "@suppo/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@suppo/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@suppo/ui/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@suppo/ui/components/ui/select";
import { Search, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { AiInsightPanel } from "./ai-insight-panel";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";

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
  analysisEnabled: boolean;
}

export function AuditLogList({ initialLogs, initialPagination, analysisEnabled }: AuditLogListProps) {
  const copy = useAdminCopy();
  const t = (key: string, koText: string, enText?: string) =>
    copy[key] ?? (copy.locale === "en" ? (enText ?? koText) : koText);
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
      setLogs(data.logs ?? data.auditLogs ?? []);
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

  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      fetchLogs(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">{t("auditLogsFilter", "필터")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("auditLogsActorPlaceholder", "작업자/설명 검색")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue placeholder={t("auditLogsActionPlaceholder", "작업 유형")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("commonAll", "전체")}</SelectItem>
                {AUDIT_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger>
                <SelectValue placeholder={t("auditLogsResourcePlaceholder", "리소스 유형")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("commonAll", "전체")}</SelectItem>
                {RESOURCE_TYPES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder={t("auditLogsDateFromPlaceholder", "시작일")}
            />
            
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder={t("auditLogsDateToPlaceholder", "종료일")}
            />
          </div>
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
          {t("commonSave", "저장")}
        </Button>
      </div>

      {analysisEnabled && (
        <AiInsightPanel
          title={t("auditLogsAiTitle", "AI 이상 패턴 탐지", "AI anomaly detection")}
          fetchFn={() =>
            fetch("/api/ai/audit-anomaly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ search, action, resourceType, startDate, endDate }) })
              .then(async (res) => { if (!res.ok) throw new Error("fetch failed"); return (await res.json()).result as string | null; })
          }
          description={t("auditLogsAiDescription", "현재 필터 조건의 감사 로그에서 비정상 패턴을 AI가 탐지합니다.", "AI detects anomalous patterns in audit logs for the current filters.")}
        />
      )}

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">{t("auditLogsTimestamp", "일시", "Timestamp")}</TableHead>
                <TableHead>{t("auditLogsActor", "작업자", "Actor")}</TableHead>
                <TableHead>{t("auditLogsAction", "작업", "Action")}</TableHead>
                <TableHead>{t("auditLogsResource", "리소스", "Resource")}</TableHead>
                <TableHead className="max-w-[300px]">{t("commonDescription", "설명", "Description")}</TableHead>
                <TableHead className="w-[120px]">{t("auditLogsIpAddress", "IP 주소", "IP address")}</TableHead>
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
                    {t("commonNotFound", "찾을 수 없습니다")}
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
                <span className="sr-only">{t("commonPreviousPage", "이전 페이지", "Previous page")}</span>
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
                <span className="sr-only">{t("commonNextPage", "다음 페이지", "Next page")}</span>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
