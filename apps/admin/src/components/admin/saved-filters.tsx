"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@crinity/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@crinity/ui/components/ui/dropdown-menu";
import { Bookmark, Save } from "lucide-react";
import { toast } from "sonner";

interface FilterConfig {
  queue?: string;
  status?: string;
  priority?: string;
  categoryId?: string;
  assigneeId?: string;
  search?: string;
  customerSegment?: string;
  slaState?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface SortConfig {
  field?: string;
  direction?: "asc" | "desc";
}

interface SavedFilter {
  id: string;
  name: string;
  description: string | null;
  filterConfig: FilterConfig;
  sortConfig: SortConfig | null;
  isDefault: boolean;
  isShared: boolean;
}

interface SavedFiltersProps {
  currentFilter: FilterConfig;
  currentSort?: SortConfig;
  onApplyFilter: (filter: FilterConfig, sort?: SortConfig) => void;
}

export function SavedFilters({ currentFilter, currentSort, onApplyFilter }: SavedFiltersProps) {
  const router = useRouter();
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");

  useEffect(() => {
    fetchSavedFilters();
  }, []);

  async function fetchSavedFilters() {
    try {
      const response = await fetch("/api/admin/saved-filters");
      if (response.ok) {
        const data = await response.json();
        setSavedFilters(data);
      }
    } catch (error) {
      console.error("Failed to fetch saved filters:", error);
    }
  }

  async function handleSaveFilter() {
    if (!newFilterName.trim()) {
      toast.error("필터 이름을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/saved-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFilterName,
          filterConfig: currentFilter,
          sortConfig: currentSort || null,
        }),
      });

      if (!response.ok) throw new Error();

      toast.success("필터가 저장되었습니다.");
      setSaveDialogOpen(false);
      setNewFilterName("");
      fetchSavedFilters();
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteFilter(id: string) {
    if (!confirm("이 필터를 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/admin/saved-filters/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error();

      toast.success("필터가 삭제되었습니다.");
      fetchSavedFilters();
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Bookmark className="h-4 w-4 mr-2" />
            저장된 필터
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {savedFilters.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              저장된 필터가 없습니다.
            </div>
          ) : (
            <>
              {savedFilters.map((filter) => (
                <DropdownMenuItem
                  key={filter.id}
                  onClick={() => onApplyFilter(filter.filterConfig, filter.sortConfig || undefined)}
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  <div className="flex-1">
                    <div className="font-medium">{filter.name}</div>
                    {filter.description && (
                      <div className="text-xs text-muted-foreground">{filter.description}</div>
                    )}
                  </div>
                  {filter.isShared && (
                    <span className="text-xs bg-primary/10 text-primary px-1 rounded">공유</span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
                <Save className="h-4 w-4 mr-2" />
                현재 필터 저장
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)}>
        <Save className="h-4 w-4 mr-2" />
        저장
      </Button>

      {saveDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">필터 저장</h3>
            <input
              type="text"
              placeholder="필터 이름"
              value={newFilterName}
              onChange={(e) => setNewFilterName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSaveFilter} disabled={isLoading}>
                {isLoading ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
