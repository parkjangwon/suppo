"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CategoryItem {
  id: string;
  name: string;
}

interface AgentItem {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "AGENT";
  isActive: boolean;
  maxTickets: number;
  categories: Array<{
    category: {
      id: string;
      name: string;
    };
  }>;
  _count?: {
    assignedTickets: number;
  };
}

interface AgentListProps {
  initialAgents: AgentItem[];
  categories: CategoryItem[];
}

interface AgentFormState {
  name: string;
  email: string;
  role: "ADMIN" | "AGENT";
  maxTickets: number;
  categories: string[];
}

const EMPTY_FORM: AgentFormState = {
  name: "",
  email: "",
  role: "AGENT",
  maxTickets: 10,
  categories: []
};

export function AgentList({ initialAgents, categories }: AgentListProps) {
  const [agents, setAgents] = useState(initialAgents);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [createForm, setCreateForm] = useState<AgentFormState>(EMPTY_FORM);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AgentFormState>(EMPTY_FORM);

  const activeCount = useMemo(() => agents.filter((agent) => agent.isActive).length, [agents]);

  const toggleCategory = (
    current: string[],
    categoryId: string,
    setter: (updater: (state: AgentFormState) => AgentFormState) => void
  ) => {
    setter((state) => {
      const selected = current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId];

      return {
        ...state,
        categories: selected
      };
    });
  };

  const submitCreate = async () => {
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm)
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "상담원 추가에 실패했습니다");
        return;
      }

      setAgents((prev) => [...prev, data.agent]);
      setCreateForm(EMPTY_FORM);
      setShowCreateForm(false);
    } catch {
      setError("상담원 추가 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (agent: AgentItem) => {
    setEditingAgentId(agent.id);
    setEditForm({
      name: agent.name,
      email: agent.email,
      role: agent.role,
      maxTickets: agent.maxTickets,
      categories: agent.categories.map((item) => item.category.id)
    });
    setError("");
  };

  const submitEdit = async () => {
    if (!editingAgentId) {
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/agents/${editingAgentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "상담원 수정에 실패했습니다");
        return;
      }

      setAgents((prev) => prev.map((agent) => (agent.id === editingAgentId ? data.agent : agent)));
      setEditingAgentId(null);
    } catch {
      setError("상담원 수정 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const deactivate = async (agentId: string) => {
    const confirmed = window.confirm("비활성화 시 처리중인 티켓 재할당이 진행됩니다. 계속하시겠습니까?");
    if (!confirmed) {
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/agents/${agentId}/deactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "처리중인 티켓 재할당" })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "비활성화에 실패했습니다");
        return;
      }

      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === agentId
            ? {
                ...agent,
                isActive: false
              }
            : agent
        )
      );
    } catch {
      setError("비활성화 처리 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (agentId: string) => {
    if (!window.confirm("상담원을 삭제하시겠습니까?")) {
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "삭제에 실패했습니다");
        return;
      }

      setAgents((prev) => prev.filter((agent) => agent.id !== agentId));
    } catch {
      setError("삭제 처리 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">상담원 관리</h2>
          <p className="text-sm text-slate-400">
            전체 {agents.length}명 / 활성 {activeCount}명
          </p>
        </div>
        <Button type="button" onClick={() => setShowCreateForm((prev) => !prev)}>
          상담원 추가
        </Button>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {showCreateForm ? (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-sm font-medium">신규 상담원</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={createForm.name}
              onChange={(event) => setCreateForm((state) => ({ ...state, name: event.target.value }))}
              placeholder="이름"
              className="border-slate-700 bg-slate-950"
            />
            <Input
              value={createForm.email}
              onChange={(event) => setCreateForm((state) => ({ ...state, email: event.target.value }))}
              placeholder="이메일"
              className="border-slate-700 bg-slate-950"
            />
            <select
              value={createForm.role}
              onChange={(event) =>
                setCreateForm((state) => ({
                  ...state,
                  role: event.target.value as "ADMIN" | "AGENT"
                }))
              }
              className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
            >
              <option value="AGENT">AGENT</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <Input
              type="number"
              min={1}
              value={createForm.maxTickets}
              onChange={(event) =>
                setCreateForm((state) => ({
                  ...state,
                  maxTickets: Number(event.target.value || 1)
                }))
              }
              className="border-slate-700 bg-slate-950"
            />
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {categories.map((category) => (
              <label key={category.id} className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={createForm.categories.includes(category.id)}
                  onChange={() => toggleCategory(createForm.categories, category.id, setCreateForm)}
                />
                {category.name}
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={submitCreate} disabled={isSaving}>
              {isSaving ? "저장 중..." : "상담원 추가"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/70 text-slate-300">
            <tr>
              <th className="px-4 py-3 text-left">이름</th>
              <th className="px-4 py-3 text-left">이메일</th>
              <th className="px-4 py-3 text-left">역할</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-left">카테고리</th>
              <th className="px-4 py-3 text-left">진행중</th>
              <th className="px-4 py-3 text-left">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {agents.map((agent) => (
              <tr key={agent.id}>
                <td className="px-4 py-3 text-slate-100">{agent.name}</td>
                <td className="px-4 py-3 text-slate-300">{agent.email}</td>
                <td className="px-4 py-3 text-slate-300">{agent.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      agent.isActive
                        ? "rounded-full bg-emerald-900/50 px-2 py-1 text-xs text-emerald-300"
                        : "rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400"
                    }
                  >
                    {agent.isActive ? "활성" : "비활성"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {agent.categories.length > 0
                    ? agent.categories.map((item) => item.category.name).join(", ")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-slate-300">{agent._count?.assignedTickets ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => startEdit(agent)}>
                      수정
                    </Button>
                    {agent.isActive ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => deactivate(agent.id)}>
                        비활성화
                      </Button>
                    ) : null}
                    <Button type="button" size="sm" variant="destructive" onClick={() => remove(agent.id)}>
                      삭제
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingAgentId ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h3 className="text-lg font-semibold">상담원 수정</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={editForm.name}
                onChange={(event) => setEditForm((state) => ({ ...state, name: event.target.value }))}
                className="border-slate-700 bg-slate-950"
              />
              <Input
                value={editForm.email}
                onChange={(event) => setEditForm((state) => ({ ...state, email: event.target.value }))}
                className="border-slate-700 bg-slate-950"
              />
              <select
                value={editForm.role}
                onChange={(event) =>
                  setEditForm((state) => ({
                    ...state,
                    role: event.target.value as "ADMIN" | "AGENT"
                  }))
                }
                className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
              >
                <option value="AGENT">AGENT</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <Input
                type="number"
                min={1}
                value={editForm.maxTickets}
                onChange={(event) =>
                  setEditForm((state) => ({
                    ...state,
                    maxTickets: Number(event.target.value || 1)
                  }))
                }
                className="border-slate-700 bg-slate-950"
              />
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={editForm.categories.includes(category.id)}
                    onChange={() => toggleCategory(editForm.categories, category.id, setEditForm)}
                  />
                  {category.name}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingAgentId(null)}>
                취소
              </Button>
              <Button type="button" onClick={submitEdit} disabled={isSaving}>
                {isSaving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export type { AgentListProps };
