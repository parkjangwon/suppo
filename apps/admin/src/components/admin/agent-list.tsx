"use client";

import { useMemo, useState } from "react";
import { Button } from "@crinity/ui/components/ui/button";
import { Input } from "@crinity/ui/components/ui/input";
import { Label } from "@crinity/ui/components/ui/label";
import { Badge } from "@crinity/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@crinity/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@crinity/ui/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crinity/ui/components/ui/select";
import { Separator } from "@crinity/ui/components/ui/separator";
import { toast } from "sonner";
import { getBackofficeRoleLabel, type BackofficeRole } from "@crinity/shared/auth/config";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Shield,
  User,
  Mail,
  Inbox,
  AlertCircle,
  Phone,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import { formatPhoneNumberInput } from "@crinity/shared/utils/phone-format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@crinity/ui/components/ui/dropdown-menu";

interface CategoryItem {
  id: string;
  name: string;
}

interface AgentItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: BackofficeRole;
  isActive: boolean;
  maxTickets: number;
  categories: Array<{
    category: {
      id: string;
      name: string;
    };
  }>;
  teamMemberships?: Array<{
    team: {
      id: string;
      name: string;
    };
    isLeader: boolean;
  }>;
  _count?: {
    assignedTickets: number;
  };
  absences?: Array<{
    id: string;
    type: string;
    startDate: Date;
    endDate: Date;
  }>;
}

interface TeamItem {
  id: string;
  name: string;
}

interface AgentListProps {
  initialAgents: AgentItem[];
  categories: CategoryItem[];
  teams?: TeamItem[];
  isAdmin?: boolean;
}

interface AgentFormState {
  name: string;
  email: string;
  phone: string;
  role: BackofficeRole;
  maxTickets: number;
  categories: string[];
  teams: string[];
  leaderTeamId: string;
}

const EMPTY_FORM: AgentFormState = {
  name: "",
  email: "",
  phone: "",
  role: "AGENT",
  maxTickets: 10,
  categories: [],
  teams: [],
  leaderTeamId: "",
};

export function AgentList({ initialAgents, categories, teams = [], isAdmin = false }: AgentListProps) {
  const [agents, setAgents] = useState(initialAgents);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createForm, setCreateForm] = useState<AgentFormState>(EMPTY_FORM);
  const [editingAgent, setEditingAgent] = useState<AgentItem | null>(null);
  const [editForm, setEditForm] = useState<AgentFormState>(EMPTY_FORM);
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ agentName: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents;
    const query = searchQuery.toLowerCase();
    return agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.email.toLowerCase().includes(query)
    );
  }, [agents, searchQuery]);

  const stats = useMemo(() => {
    const total = agents.length;
    const active = agents.filter((a) => a.isActive).length;
    const inactive = total - active;
    const admins = agents.filter((a) => a.role === "ADMIN" && a.isActive).length;
    const totalTickets = agents.reduce(
      (sum, a) => sum + (a._count?.assignedTickets || 0),
      0
    );
    return { total, active, inactive, admins, totalTickets };
  }, [agents]);

  const toggleCategory = (
    current: string[],
    categoryId: string,
    setter: React.Dispatch<React.SetStateAction<AgentFormState>>
  ) => {
    setter((state) => ({
      ...state,
      categories: current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    }));
  };

  const toggleTeam = (
    current: string[],
    teamId: string,
    setter: React.Dispatch<React.SetStateAction<AgentFormState>>
  ) => {
    setter((state) => ({
      ...state,
      teams: current.includes(teamId)
        ? current.filter((id) => id !== teamId)
        : [...current, teamId],
      leaderTeamId: state.leaderTeamId === teamId ? "" : state.leaderTeamId,
    }));
  };

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.email.trim()) {
      toast.error("이름과 이메일을 입력해주세요");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "상담원 추가에 실패했습니다");
        return;
      }

      setAgents((prev) => [...prev, data.agent]);
      setCreateForm(EMPTY_FORM);
      setIsCreateDialogOpen(false);
      if (data.tempPassword) {
        setTempPasswordInfo({ agentName: data.agent.name, tempPassword: data.tempPassword });
      } else {
        toast.success("상담원이 추가되었습니다");
      }
    } catch {
      toast.error("상담원 추가 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingAgent) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/agents/${editingAgent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "상담원 수정에 실패했습니다");
        return;
      }

      setAgents((prev) =>
        prev.map((agent) => (agent.id === editingAgent.id ? data.agent : agent))
      );
      setEditingAgent(null);
      toast.success("상담원 정보가 수정되었습니다");
    } catch {
      toast.error("상담원 수정 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (agent: AgentItem) => {
    const confirmed = window.confirm(
      `"${agent.name}" 상담원을 비활성화하시겠습니까?\n처리중인 티켓은 자동으로 재할당됩니다.`
    );
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/agents/${agent.id}/deactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "관리자에 의한 비활성화" }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "비활성화에 실패했습니다");
        return;
      }

      setAgents((prev) =>
        prev.map((a) => (a.id === agent.id ? { ...a, isActive: false } : a))
      );
      toast.success("상담원이 비활성화되었습니다");
    } catch {
      toast.error("비활성화 처리 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (agent: AgentItem) => {
    const confirmed = window.confirm(
      `"${agent.name}" 상담원을 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "삭제에 실패했습니다");
        return;
      }

      setAgents((prev) => prev.filter((a) => a.id !== agent.id));
      toast.success("상담원이 삭제되었습니다");
    } catch {
      toast.error("삭제 처리 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (agent: AgentItem) => {
    const confirmed = window.confirm(
      `"${agent.name}" 상담원의 비밀번호를 초기화하시겠습니까?\n새 임시 비밀번호가 생성됩니다.`
    );
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/agents/${agent.id}/reset-password`, {
        method: "POST",
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "비밀번호 초기화에 실패했습니다");
        return;
      }

      setTempPasswordInfo({ agentName: agent.name, tempPassword: data.tempPassword });
    } catch {
      toast.error("비밀번호 초기화 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = (agent: AgentItem) => {
    setEditingAgent(agent);
    const teamIds = agent.teamMemberships?.map((tm) => tm.team.id) ?? [];
    const leaderTeamId = agent.teamMemberships?.find((tm) => tm.isLeader)?.team.id ?? "";
    setEditForm({
      name: agent.name,
      email: agent.email,
      phone: agent.phone ?? "",
      role: agent.role,
      maxTickets: agent.maxTickets,
      categories: agent.categories.map((c) => c.category.id),
      teams: teamIds,
      leaderTeamId,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">전체 상담원</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500 dark:text-blue-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">활성 상담원</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.active}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400">관리자</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.admins}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-500 dark:text-purple-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 dark:text-amber-400">진행중인 티켓</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.totalTickets}</p>
              </div>
              <Inbox className="w-8 h-8 text-amber-500 dark:text-amber-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="이름 또는 이메일로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="gap-2">
            <Plus className="w-4 h-4" />
            상담원 추가
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => (
          <Card
            key={agent.id}
            className={`group transition-all hover:shadow-md ${
              !agent.isActive ? "opacity-60 grayscale" : ""
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-lg">
                      {agent.name.charAt(0)}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${
                        agent.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                      }`}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">{agent.name}</CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />
                      {agent.email}
                    </CardDescription>
                    {agent.phone && (
                      <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {agent.phone}
                      </CardDescription>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(agent)}>
                        정보 수정
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleResetPassword(agent)}
                        className="text-blue-600 dark:text-blue-400"
                      >
                        <KeyRound className="w-3 h-3 mr-2" />
                        비밀번호 초기화
                      </DropdownMenuItem>
                      {agent.isActive ? (
                        <DropdownMenuItem
                          onClick={() => handleDeactivate(agent)}
                          className="text-amber-600"
                        >
                          비활성화
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => {
                            /* 활성화 로직 */
                          }}
                          className="text-emerald-600"
                        >
                          활성화
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(agent)}
                        className="text-destructive"
                      >
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={agent.role === "ADMIN" ? "default" : "secondary"}
                  className={getRoleBadgeClass(agent.role)}
                >
                  {agent.role === "ADMIN" ? (
                    <Shield className="w-3 h-3 mr-1" />
                  ) : (
                    <User className="w-3 h-3 mr-1" />
                  )}
                  {getBackofficeRoleLabel(agent.role)}
                </Badge>
                <Badge
                  variant={agent.isActive ? "default" : "secondary"}
                  className={
                    agent.isActive
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                      : ""
                  }
                >
                  {agent.isActive ? "활성" : "비활성"}
                </Badge>
                {agent.absences && agent.absences.length > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200"
                  >
                    부재중
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground mb-1">진행중인 티켓</p>
                  <p className="font-semibold text-lg">{agent._count?.assignedTickets ?? 0}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground mb-1">최대 배정</p>
                  <p className="font-semibold text-lg">{agent.maxTickets}</p>
                </div>
              </div>

              {agent.teamMemberships && agent.teamMemberships.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">소속 팀</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.teamMemberships.map((tm) => (
                      <Badge key={tm.team.id} variant="outline" className="text-xs">
                        {tm.team.name}
                        {tm.isLeader && (
                          <span className="ml-1 text-amber-500">★</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {agent.categories.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">전문 분야</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.categories.slice(0, 3).map((c) => (
                      <Badge key={c.category.id} variant="secondary" className="text-xs font-normal">
                        {c.category.name}
                      </Badge>
                    ))}
                    {agent.categories.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{agent.categories.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">검색 결과가 없습니다</h3>
          <p className="text-sm text-muted-foreground">
            다른 검색어를 시도하거나 상담원을 추가해보세요
          </p>
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              새 상담원 추가
            </DialogTitle>
            <DialogDescription>
              새로운 상담원을 등록합니다. 이메일로 로그인 정보가 발송됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="홍길동"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="agent@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                value={createForm.phone}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    phone: formatPhoneNumberInput(e.target.value),
                  }))
                }
                placeholder="010-0000-0000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">역할</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) =>
                    setCreateForm((prev) => ({ ...prev, role: value as BackofficeRole }))
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">관리자</SelectItem>
                    <SelectItem value="TEAM_LEAD">팀장</SelectItem>
                    <SelectItem value="AGENT">상담원</SelectItem>
                    <SelectItem value="VIEWER">읽기전용</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTickets">최대 티켓 수</Label>
                <Input
                  id="maxTickets"
                  type="number"
                  min={1}
                  max={50}
                  value={createForm.maxTickets}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      maxTickets: parseInt(e.target.value) || 10,
                    }))
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>전문 카테고리</Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={createForm.categories.includes(category.id)}
                      onChange={() =>
                        toggleCategory(createForm.categories, category.id, setCreateForm)
                      }
                      className="rounded border-input"
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {teams.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label>소속 팀</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {teams.map((team) => (
                      <label
                        key={team.id}
                        className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={createForm.teams.includes(team.id)}
                          onChange={() =>
                            toggleTeam(createForm.teams, team.id, setCreateForm)
                          }
                          className="rounded border-input"
                        />
                        <span className="text-sm">{team.name}</span>
                      </label>
                    ))}
                  </div>
                  {createForm.teams.length > 0 && (
                    <div className="space-y-2">
                      <Label>팀장 역할</Label>
                      <Select
                        value={createForm.leaderTeamId || "none"}
                        onValueChange={(value) =>
                          setCreateForm((prev) => ({ ...prev, leaderTeamId: value === "none" ? "" : value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="팀장으로 지정할 팀 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">팀장 없음</SelectItem>
                          {teams
                            .filter((t) => createForm.teams.includes(t.id))
                            .map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? "추가 중..." : "추가하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!tempPasswordInfo}
        onOpenChange={(open) => {
          if (!open) {
            setTempPasswordInfo(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-500" />
              임시 비밀번호 발급
            </DialogTitle>
            <DialogDescription>
              <strong>{tempPasswordInfo?.agentName}</strong> 상담원의 임시 비밀번호입니다.
              이 화면을 닫으면 다시 확인할 수 없습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="flex-1 text-lg font-mono font-semibold tracking-widest select-all">
                {tempPasswordInfo?.tempPassword}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  if (tempPasswordInfo?.tempPassword) {
                    navigator.clipboard.writeText(tempPasswordInfo.tempPassword);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              상담원에게 이 비밀번호를 전달해주세요. 첫 로그인 시 비밀번호 변경이 강제됩니다.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setTempPasswordInfo(null);
                setCopied(false);
              }}
            >
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>상담원 정보 수정</DialogTitle>
            <DialogDescription>{editingAgent?.name} 상담원의 정보를 수정합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">이름</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">이메일</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">전화번호</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    phone: formatPhoneNumberInput(e.target.value),
                  }))
                }
                placeholder="010-0000-0000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">역할</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) =>
                    setEditForm((prev) => ({ ...prev, role: value as BackofficeRole }))
                  }
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">관리자</SelectItem>
                    <SelectItem value="TEAM_LEAD">팀장</SelectItem>
                    <SelectItem value="AGENT">상담원</SelectItem>
                    <SelectItem value="VIEWER">읽기전용</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-maxTickets">최대 티켓 수</Label>
                <Input
                  id="edit-maxTickets"
                  type="number"
                  min={1}
                  max={50}
                  value={editForm.maxTickets}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      maxTickets: parseInt(e.target.value) || 10,
                    }))
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>전문 카테고리</Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={editForm.categories.includes(category.id)}
                      onChange={() =>
                        toggleCategory(editForm.categories, category.id, setEditForm)
                      }
                      className="rounded border-input"
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {teams.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label>소속 팀</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {teams.map((team) => (
                      <label
                        key={team.id}
                        className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={editForm.teams.includes(team.id)}
                          onChange={() =>
                            toggleTeam(editForm.teams, team.id, setEditForm)
                          }
                          className="rounded border-input"
                        />
                        <span className="text-sm">{team.name}</span>
                      </label>
                    ))}
                  </div>
                  {editForm.teams.length > 0 && (
                    <div className="space-y-2">
                      <Label>팀장 역할</Label>
                      <Select
                        value={editForm.leaderTeamId || "none"}
                        onValueChange={(value) =>
                          setEditForm((prev) => ({ ...prev, leaderTeamId: value === "none" ? "" : value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="팀장으로 지정할 팀 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">팀장 없음</SelectItem>
                          {teams
                            .filter((t) => editForm.teams.includes(t.id))
                            .map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingAgent(null)}>
              취소
            </Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getRoleBadgeClass(role: BackofficeRole) {
  switch (role) {
    case "ADMIN":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20";
    case "TEAM_LEAD":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20";
    case "VIEWER":
      return "bg-slate-500/10 text-slate-700 dark:text-slate-300 hover:bg-slate-500/20";
    case "AGENT":
    default:
      return "";
  }
}

export type { AgentListProps };
