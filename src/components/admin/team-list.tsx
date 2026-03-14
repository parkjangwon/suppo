"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Edit2, Users } from "lucide-react";

interface Team {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  members: {
    agent: { id: string; name: string; email: string };
    isLeader: boolean;
  }[];
  _count: { tickets: number };
}

interface TeamListProps {
  teams: Team[];
  agents: { id: string; name: string; email: string }[];
}

export function TeamList({ teams, agents }: TeamListProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    memberIds: [] as string[],
    leaderId: "",
    isActive: true,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "생성에 실패했습니다");
      }

      setIsCreateOpen(false);
      toast.success("팀이 생성되었습니다");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTeamStatus = async (teamId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) throw new Error("상태 변경에 실패했습니다");

      toast.success(isActive ? "활성화되었습니다" : "비활성화되었습니다");
      router.refresh();
    } catch (error) {
      toast.error("상태 변경에 실패했습니다");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              팀 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>새 팀 생성</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>팀 이름</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="예: 기술 지원팀"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="팀에 대한 설명"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>팀원 선택</Label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                  {agents.map((agent) => (
                    <label
                      key={agent.id}
                      className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={formData.memberIds.includes(agent.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              memberIds: [...formData.memberIds, agent.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              memberIds: formData.memberIds.filter(
                                (id) => id !== agent.id
                              ),
                              leaderId:
                                formData.leaderId === agent.id
                                  ? ""
                                  : formData.leaderId,
                            });
                          }
                        }}
                      />
                      <span className="text-sm">{agent.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formData.memberIds.length > 0 && (
                <div className="space-y-2">
                  <Label>팀장 선택</Label>
                  <select
                    value={formData.leaderId}
                    onChange={(e) =>
                      setFormData({ ...formData, leaderId: e.target.value })
                    }
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                  >
                    <option value="">팀장 없음</option>
                    {agents
                      .filter((a) => formData.memberIds.includes(a.id))
                      .map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(v) =>
                    setFormData({ ...formData, isActive: v })
                  }
                />
                <Label htmlFor="isActive">활성화</Label>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "생성 중..." : "생성"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <Card key={team.id} className={!team.isActive ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  {team.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {team.description}
                    </p>
                  )}
                </div>
                <Switch
                  checked={team.isActive}
                  onCheckedChange={(checked) =>
                    toggleTeamStatus(team.id, checked)
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Users className="w-4 h-4" />
                <span>팀원 {team.members.length}명</span>
                <span className="mx-1">•</span>
                <span>티켓 {team._count.tickets}개</span>
              </div>

              <div className="space-y-1">
                {team.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    팀원이 없습니다
                  </p>
                ) : (
                  team.members.map((member) => (
                    <div
                      key={member.agent.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span>{member.agent.name}</span>
                      {member.isLeader && (
                        <Badge variant="secondary" className="text-xs">
                          팀장
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          등록된 팀이 없습니다
        </div>
      )}
    </div>
  );
}
