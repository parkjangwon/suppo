"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  email: string;
}

interface Absence {
  id: string;
  agentId: string;
  title: string;
  description?: string;
  type: "VACATION" | "SICK_LEAVE" | "BUSINESS_TRIP" | "REMOTE_WORK" | "TRAINING" | "OTHER";
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  agent: Agent;
  createdBy: { id: string; name: string };
}

const absenceTypeLabels: Record<string, string> = {
  VACATION: "휴가",
  SICK_LEAVE: "병가",
  BUSINESS_TRIP: "출장",
  REMOTE_WORK: "재택근무",
  TRAINING: "교육",
  OTHER: "기타",
};

const absenceTypeColors: Record<string, string> = {
  VACATION: "bg-blue-100 text-blue-800 border-blue-200",
  SICK_LEAVE: "bg-red-100 text-red-800 border-red-200",
  BUSINESS_TRIP: "bg-purple-100 text-purple-800 border-purple-200",
  REMOTE_WORK: "bg-green-100 text-green-800 border-green-200",
  TRAINING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  OTHER: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = session?.user?.role === "ADMIN";

  if (!mounted) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex items-center justify-center min-h-[400px]">
            <div className="text-muted-foreground">로딩 중...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [formData, setFormData] = useState({
    agentId: "",
    title: "",
    description: "",
    type: "VACATION" as Absence["type"],
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (!session) return;
    fetchAbsences();
    if (isAdmin) {
      fetchAgents();
    }
  }, [currentDate, isAdmin, session]);

  const fetchAbsences = async () => {
    try {
      const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
      const end = format(endOfMonth(currentDate), "yyyy-MM-dd");
      const res = await fetch(`/api/admin/agents/absences?start=${start}&end=${end}`);
      if (!res.ok) throw new Error("Failed to fetch absences");
      const data = await res.json();
      setAbsences(data);
    } catch (error) {
      toast.error("일정을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/admin/agents");
      if (!res.ok) throw new Error("Failed to fetch agents");
      const data = await res.json();
      setAgents(data);
    } catch (error) {
      toast.error("상담원 목록을 불러오는 중 오류가 발생했습니다.");
    }
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  const getAbsencesForDate = (date: Date) => {
    return absences.filter((absence) => {
      const start = parseISO(absence.startDate);
      const end = parseISO(absence.endDate);
      return date >= start && date <= end;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingAbsence
        ? `/api/admin/agents/absences/${editingAbsence.id}`
        : "/api/admin/agents/absences";
      const method = editingAbsence ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save");
      }

      toast.success(editingAbsence ? "일정이 수정되었습니다." : "일정이 등록되었습니다.");
      setIsDialogOpen(false);
      setEditingAbsence(null);
      resetForm();
      fetchAbsences();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "일정 저장 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/admin/agents/absences/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("일정이 삭제되었습니다.");
      fetchAbsences();
    } catch (error) {
      toast.error("일정 삭제 중 오류가 발생했습니다.");
    }
  };

  const openEditDialog = (absence: Absence) => {
    setEditingAbsence(absence);
    setFormData({
      agentId: absence.agentId,
      title: absence.title,
      description: absence.description || "",
      type: absence.type,
      startDate: format(parseISO(absence.startDate), "yyyy-MM-dd'T'HH:mm"),
      endDate: format(parseISO(absence.endDate), "yyyy-MM-dd'T'HH:mm"),
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = (date?: Date) => {
    setEditingAbsence(null);
    const baseDate = date || new Date();
    resetForm();
    setFormData((prev) => ({
      ...prev,
      agentId: isAdmin ? "" : session?.user?.id || "",
      startDate: format(baseDate, "yyyy-MM-dd'T'09:00"),
      endDate: format(baseDate, "yyyy-MM-dd'T'18:00"),
    }));
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      agentId: "",
      title: "",
      description: "",
      type: "VACATION",
      startDate: "",
      endDate: "",
    });
  };

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">상담원 일정 관리</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold min-w-[120px] text-center">
                {format(currentDate, "yyyy년 MM월", { locale: ko })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => openCreateDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              일정 등록
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-muted-foreground">로딩 중...</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="bg-muted p-3 text-center text-sm font-medium"
                  >
                    {day}
                  </div>
                ))}
                {calendarDays.map((day, idx) => {
                  const dayAbsences = getAbsencesForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={idx}
                      className={`bg-background min-h-[100px] p-2 ${
                        isCurrentMonth ? "" : "bg-muted/50"
                      } ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                      onClick={() => openCreateDialog(day)}
                    >
                      <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? "" : "text-muted-foreground"}`}>
                        {format(day, "d")}
                      </div>
                      <div className="space-y-1">
                        {dayAbsences.slice(0, 3).map((absence) => (
                          <div
                            key={absence.id}
                            className={`text-xs px-2 py-1 rounded border ${absenceTypeColors[absence.type]} truncate cursor-pointer hover:opacity-80`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(absence);
                            }}
                          >
                            {absence.agent.name} - {absenceTypeLabels[absence.type]}
                          </div>
                        ))}
                        {dayAbsences.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{dayAbsences.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-4">
                {Object.entries(absenceTypeLabels).map(([type, label]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border ${absenceTypeColors[type]}`} />
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingAbsence ? "일정 수정" : "일정 등록"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isAdmin && (
              <div className="space-y-2">
                <Label>상담원</Label>
                <Select
                  value={formData.agentId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, agentId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="상담원을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} ({agent.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>일정 유형</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as Absence["type"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(absenceTypeLabels).map(([type, label]) => (
                    <SelectItem key={type} value={type}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>제목</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="일정 제목을 입력하세요"
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
                placeholder="추가 설명을 입력하세요 (선택사항)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>시작일</Label>
                <Input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>종료일</Label>
                <Input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              {editingAbsence && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDelete(editingAbsence.id)}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              )}
              <Button type="submit" className="flex-1">
                {editingAbsence ? "수정" : "등록"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
