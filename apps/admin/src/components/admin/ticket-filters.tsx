"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Input } from "@crinity/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crinity/ui/components/ui/select";
import { Button } from "@crinity/ui/components/ui/button";
import { Search, X, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@crinity/ui/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@crinity/ui/components/ui/popover";
import { cn } from "@crinity/shared/utils";

interface TicketFiltersProps {
  categories: { id: string; name: string }[];
  agents: { id: string; name: string }[];
  showBasicSearch?: boolean;
}

export function TicketFilters({ categories, agents, showBasicSearch = true }: TicketFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : undefined
  );

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      params.delete("cursor");
      return params.toString();
    },
    [searchParams]
  );

  const handleFilterChange = (name: string, value: string) => {
    router.push(`?${createQueryString(name, value === "all" ? "" : value)}`);
  };

  const handleDateChange = (name: "dateFrom" | "dateTo", date: Date | undefined) => {
    if (date) {
      router.push(`?${createQueryString(name, format(date, "yyyy-MM-dd"))}`);
    } else {
      router.push(`?${createQueryString(name, "")}`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange("search", search);
  };

  const clearFilters = () => {
    setSearch("");
    setDateFrom(undefined);
    setDateTo(undefined);
    router.push("?");
  };

  const hasFilters = Array.from(searchParams.keys()).length > 0;

  return (
    <div className="space-y-4 mb-6">
      {showBasicSearch && (
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="티켓 번호, 제목, 이메일 검색..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">검색</Button>
          </form>

          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters} className="shrink-0">
              <X className="mr-2 h-4 w-4" />
              필터 초기화
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateFrom && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "yyyy.MM.dd", { locale: ko }) : "시작일"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateFrom}
              onSelect={(date) => {
                setDateFrom(date);
                handleDateChange("dateFrom", date);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateTo && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "yyyy.MM.dd", { locale: ko }) : "종료일"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateTo}
              onSelect={(date) => {
                setDateTo(date);
                handleDateChange("dateTo", date);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Select
          value={searchParams.get("status") || "all"}
          onValueChange={(value) => handleFilterChange("status", value)}
        >
          <SelectTrigger aria-label="상태 필터">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="OPEN">열림 (OPEN)</SelectItem>
            <SelectItem value="IN_PROGRESS">진행중 (IN_PROGRESS)</SelectItem>
            <SelectItem value="WAITING">대기중 (WAITING)</SelectItem>
            <SelectItem value="RESOLVED">해결됨 (RESOLVED)</SelectItem>
            <SelectItem value="CLOSED">닫힘 (CLOSED)</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("priority") || "all"}
          onValueChange={(value) => handleFilterChange("priority", value)}
        >
          <SelectTrigger aria-label="우선순위 필터">
            <SelectValue placeholder="우선순위" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 우선순위</SelectItem>
            <SelectItem value="URGENT">긴급 (URGENT)</SelectItem>
            <SelectItem value="HIGH">높음 (HIGH)</SelectItem>
            <SelectItem value="MEDIUM">보통 (MEDIUM)</SelectItem>
            <SelectItem value="LOW">낮음 (LOW)</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("categoryId") || "all"}
          onValueChange={(value) => handleFilterChange("categoryId", value)}
        >
          <SelectTrigger aria-label="문의 유형 필터">
            <SelectValue placeholder="문의 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 문의 유형</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("assigneeId") || "all"}
          onValueChange={(value) => handleFilterChange("assigneeId", value)}
        >
          <SelectTrigger aria-label="담당자 필터">
            <SelectValue placeholder="담당자" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 담당자</SelectItem>
            <SelectItem value="unassigned">미할당</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
