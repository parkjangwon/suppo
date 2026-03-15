"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface TicketFiltersProps {
  categories: { id: string; name: string }[];
  agents: { id: string; name: string }[];
}

export function TicketFilters({ categories, agents }: TicketFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState(searchParams.get("search") || "");

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange("search", search);
  };

  const clearFilters = () => {
    setSearch("");
    router.push("?");
  };

  const hasFilters = Array.from(searchParams.keys()).length > 0;

  return (
    <div className="space-y-4 mb-6">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

