"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@crinity/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@crinity/ui/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crinity/ui/components/ui/select";
import { Bookmark, Save } from "lucide-react";
import { toast } from "sonner";

interface ChatFilterConfig {
  scope: "chat";
  status?: string;
  assigneeId?: string;
  slaState?: string;
}

interface SavedFilterRecord {
  id: string;
  name: string;
  filterConfig: ChatFilterConfig;
}

export function ChatSavedViewsBar({
  currentFilter,
  agents,
}: {
  currentFilter: Omit<ChatFilterConfig, "scope">;
  agents: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [savedViews, setSavedViews] = useState<SavedFilterRecord[]>([]);
  const [viewName, setViewName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    void fetchSavedViews();
  }, []);

  async function fetchSavedViews() {
    const response = await fetch("/api/admin/saved-filters?scope=chat");
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    setSavedViews(data);
  }

  function updateFilter(next: Partial<Omit<ChatFilterConfig, "scope">>) {
    const params = new URLSearchParams();
    const merged = { ...currentFilter, ...next };
    if (merged.status) params.set("status", merged.status);
    if (merged.assigneeId) params.set("assigneeId", merged.assigneeId);
    if (merged.slaState) params.set("slaState", merged.slaState);
    router.push(`/admin/chats${params.toString() ? `?${params.toString()}` : ""}`);
  }

  async function saveView() {
    if (!viewName.trim()) {
      toast.error("보기 이름을 입력해주세요.");
      return;
    }

    const response = await fetch("/api/admin/saved-filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: viewName,
        filterConfig: {
          scope: "chat",
          ...currentFilter,
        },
      }),
    });

    if (!response.ok) {
      toast.error("보기 저장에 실패했습니다.");
      return;
    }

    setIsDialogOpen(false);
    setViewName("");
    await fetchSavedViews();
    toast.success("채팅 보기가 저장되었습니다.");
  }

  async function deleteView(id: string) {
    const response = await fetch(`/api/admin/saved-filters/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("보기 삭제에 실패했습니다.");
      return;
    }

    await fetchSavedViews();
    toast.success("채팅 보기가 삭제되었습니다.");
  }

  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-2">
        <Select value={currentFilter.status ?? "all"} onValueChange={(value) => updateFilter({ status: value === "all" ? undefined : value })}>
          <SelectTrigger aria-label="채팅 상태 필터" className="w-[160px]">
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="WAITING_AGENT">상담원 대기</SelectItem>
            <SelectItem value="WAITING_CUSTOMER">고객 대기</SelectItem>
            <SelectItem value="ACTIVE">활성</SelectItem>
            <SelectItem value="ENDED">종료</SelectItem>
          </SelectContent>
        </Select>

        <Select value={currentFilter.slaState ?? "all"} onValueChange={(value) => updateFilter({ slaState: value === "all" ? undefined : value })}>
          <SelectTrigger aria-label="채팅 SLA 필터" className="w-[160px]">
            <SelectValue placeholder="SLA 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 SLA</SelectItem>
            <SelectItem value="warning">SLA 임박</SelectItem>
            <SelectItem value="breached">SLA 초과</SelectItem>
          </SelectContent>
        </Select>

        <Select value={currentFilter.assigneeId ?? "all"} onValueChange={(value) => updateFilter({ assigneeId: value === "all" ? undefined : value })}>
          <SelectTrigger aria-label="채팅 담당자 필터" className="w-[170px]">
            <SelectValue placeholder="담당자 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 담당자</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Bookmark className="mr-2 h-4 w-4" />
              저장 보기
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {savedViews.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">저장된 채팅 보기가 없습니다.</div>
            ) : (
              <>
                {savedViews.map((view) => (
                  <DropdownMenuItem
                    key={view.id}
                    onClick={() => {
                      const { status, assigneeId, slaState } = view.filterConfig;
                      updateFilter({ status, assigneeId, slaState });
                    }}
                  >
                    <div className="flex flex-1 items-center justify-between gap-3">
                      <span>{view.name}</span>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          void deleteView(view.id);
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
              <Save className="mr-2 h-4 w-4" />
              현재 보기 저장
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6 space-y-4">
            <h3 className="text-lg font-semibold">채팅 보기 저장</h3>
            <input
              aria-label="채팅 보기 이름"
              type="text"
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="예: SLA 초과 대화"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={saveView}>저장</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
