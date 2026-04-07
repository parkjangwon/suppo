"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@crinity/ui/components/ui/input";
import { Button } from "@crinity/ui/components/ui/button";
import { Checkbox } from "@crinity/ui/components/ui/checkbox";
import { Label } from "@crinity/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@crinity/ui/components/ui/select";
import { Badge } from "@crinity/ui/components/ui/badge";
import { Search, X, Folder, Filter } from "lucide-react";
import { cn } from "@crinity/shared/utils";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";

interface AdvancedSearchProps {
  categories: { id: string; name: string }[];
  agents: { id: string; name: string }[];
  onSearch: (params: URLSearchParams) => void;
}

type SearchMode = "all" | "any" | "exact";

export function AdvancedSearch({ categories, agents, onSearch }: AdvancedSearchProps) {
  const copy = useAdminCopy() as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchFields, setSearchFields] = useState<string[]>(["subject", "description", "comments"]);
  const [searchMode, setSearchMode] = useState<SearchMode>("all");
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    try {
      const saved = localStorage.getItem("admin-saved-searches");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  interface SavedSearch {
    id: string;
    name: string;
    term: string;
    fields: string[];
    mode: SearchMode;
    filters: Record<string, string>;
  }

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (searchTerm.trim()) {
      const fieldSearch = searchFields.join(",");
      params.set("search", `${searchTerm}:${fieldSearch}`);
    }

    params.delete("cursor");
    onSearch(params);
  };

  const handleSaveSearch = () => {
    const currentFilters: Record<string, string> = {};
    const currentSearchParams = Array.from(searchParams.entries());

    // 필터 수집
    currentSearchParams.forEach(([key, value]) => {
      if (key !== "cursor" && value && value !== "all") {
        currentFilters[key] = value;
      }
    });

    const newSaved: SavedSearch = {
      id: Date.now().toString(),
      name: `검색 ${savedSearches.length + 1}`,
      term: searchTerm,
      fields: searchFields,
      mode: searchMode,
      filters: currentFilters,
    };

    const updated = [...savedSearches, newSaved].slice(0, 10);
    setSavedSearches(updated);
    localStorage.setItem("admin-saved-searches", JSON.stringify(updated));
  };

  const handleLoadSaved = (saved: SavedSearch) => {
    setSearchTerm(saved.term);
    setSearchFields(saved.fields);
    setSearchMode(saved.mode);

    // 필터 복원
    const params = new URLSearchParams();
    Object.entries(saved.filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    onSearch(params);
  };

  const handleDeleteSaved = (id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem("admin-saved-searches", JSON.stringify(updated));
  };

  const toggleSearchField = (field: string) => {
    setSearchFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchFields(["subject", "description", "comments"]);
    setSearchMode("all");
    onSearch(new URLSearchParams());
  };

  return (
    <div className="space-y-4">
      {/* 검색어 입력 및 필드 선택 */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="search-term">{t("advancedSearchPlaceholder", "검색어")}</Label>
            <Input
              id="search-term"
              placeholder={t("advancedSearchPlaceholder", "검색어를 입력하세요...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full"
            />
          </div>
          <Button onClick={handleSearch} size="sm">
            <Search className="h-4 w-4 mr-2" />
            {t("commonSearch", "검색")}
          </Button>
        </div>

        {/* 검색 필드 체크박스 */}
        <div className="flex flex-wrap gap-4 p-3 bg-card rounded-lg border">
          <Checkbox
            id="field-subject"
            checked={searchFields.includes("subject")}
            onCheckedChange={() => toggleSearchField("subject")}
          >
              <Label htmlFor="field-subject" className="cursor-pointer">
              {t("ticketDetailTitle", "제목")}
              </Label>
          </Checkbox>

          <Checkbox
            id="field-description"
            checked={searchFields.includes("description")}
            onCheckedChange={() => toggleSearchField("description")}
          >
              <Label htmlFor="field-description" className="cursor-pointer">
              {t("ticketFormBodyPlaceholder", "내용")}
              </Label>
          </Checkbox>

          <Checkbox
            id="field-comments"
            checked={searchFields.includes("comments")}
            onCheckedChange={() => toggleSearchField("comments")}
          >
              <Label htmlFor="field-comments" className="cursor-pointer">
              {t("ticketDetailComments", "댓글")}
              </Label>
          </Checkbox>

          <div className="border-l pl-4">
            <Label htmlFor="search-mode">{t("advancedSearchAny", "검색 모드")}</Label>
            <Select value={searchMode} onValueChange={(v) => setSearchMode(v as SearchMode)}>
              <SelectTrigger id="search-mode" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("advancedSearchAll", "모든 포함")}</SelectItem>
                <SelectItem value="any">{t("advancedSearchAny", "하나라도 포함")}</SelectItem>
                <SelectItem value="exact">{t("advancedSearchExact", "정확히 일치")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={clearSearch}>
          <X className="h-4 w-4 mr-2" />
          {t("commonClose", "초기화")}
        </Button>
      </div>

      {/* 저장된 검색 */}
      {savedSearches.length > 0 && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{t("savedFilterSaving", "저장된 검색")}</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSavedSearches([])}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {savedSearches.map((saved) => (
              <div
                key={saved.id}
                className="flex items-center justify-between p-2 hover:bg-accent rounded-md group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {saved.mode === "all" && t("advancedSearchAll", "모두")}
                      {saved.mode === "any" && t("advancedSearchAny", "하나라도")}
                      {saved.mode === "exact" && t("advancedSearchExact", "정확")}
                    </Badge>
                    <span className="text-sm font-medium">{saved.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    "{saved.term}" ({saved.fields.join(", ")})
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLoadSaved(saved)}
                    className="h-8 px-3"
                  >
                    <Filter className="h-4 w-4" />
                    {t("commonView", "불러오기")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSaved(saved.id)}
                    className="h-8 px-3 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
