"use client";

import { useState } from "react";
import { Plus, Edit2, Power, PowerOff, Trash2 } from "lucide-react";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";
import { Button } from "@crinity/ui/components/ui/button";
import { Input } from "@crinity/ui/components/ui/input";
import { Label } from "@crinity/ui/components/ui/label";
import { Textarea } from "@crinity/ui/components/ui/textarea";
import { Switch } from "@crinity/ui/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@crinity/ui/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crinity/ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@crinity/ui/components/ui/table";
import { Badge } from "@crinity/ui/components/ui/badge";
import { toast } from "sonner";
import { copyText } from "@/lib/i18n/admin-copy-utils";

type RequestType = {
  id: string;
  name: string;
  description: string | null;
  channel: string;
  defaultPriority: string;
  defaultTeamId: string | null;
  defaultTeam: { id: string; name: string } | null;
  autoAssignEnabled: boolean;
  isActive: boolean;
  sortOrder: number;
  _count: { tickets: number };
};

type Team = {
  id: string;
  name: string;
};

interface RequestTypeListProps {
  requestTypes: RequestType[];
  teams: Team[];
}

const priorityLabels: Record<string, string> = {
  URGENT: "긴급",
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

const channelLabels: Record<string, string> = {
  WEB: "웹",
  EMAIL: "이메일",
  API: "API",
  IN_APP: "앱 내",
};

export function RequestTypeList({ requestTypes, teams }: RequestTypeListProps) {
  const copy = useAdminCopy();
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy, key, copy.locale === "en" ? (en ?? ko) : ko);
  const [types, setTypes] = useState(requestTypes);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingType, setEditingType] = useState<RequestType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    channel: "WEB",
    defaultPriority: "MEDIUM",
    defaultTeamId: "",
    autoAssignEnabled: true,
    isActive: true,
    sortOrder: 0,
  });
  const priorityLabels: Record<string, string> = {
    URGENT: t("ticketsPriorityUrgent", "긴급", "Urgent"),
    HIGH: t("ticketsPriorityHigh", "높음", "High"),
    MEDIUM: t("ticketsPriorityMedium", "보통", "Medium"),
    LOW: t("ticketsPriorityLow", "낮음", "Low"),
  };

  const channelLabels: Record<string, string> = {
    WEB: t("requestTypeChannelWeb", "웹", "Web"),
    EMAIL: t("requestTypeChannelEmail", "이메일", "Email"),
    API: "API",
    IN_APP: t("requestTypeChannelInApp", "앱 내", "In-app"),
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      channel: "WEB",
      defaultPriority: "MEDIUM",
      defaultTeamId: "",
      autoAssignEnabled: true,
      isActive: true,
      sortOrder: 0,
    });
  };

  const handleEdit = (type: RequestType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || "",
      channel: type.channel,
      defaultPriority: type.defaultPriority,
      defaultTeamId: type.defaultTeamId || "",
      autoAssignEnabled: type.autoAssignEnabled,
      isActive: type.isActive,
      sortOrder: type.sortOrder,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingType
        ? `/api/admin/request-types/${editingType.id}`
        : "/api/admin/request-types";
      const method = editingType ? "PATCH" : "POST";

      const data = {
        ...formData,
        defaultTeamId: formData.defaultTeamId || undefined,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t("requestTypeError", "저장에 실패했습니다", "Failed to save."));
      }

      const saved = await response.json();

      if (editingType) {
        setTypes(types.map((t) => (t.id === saved.id ? { ...saved, _count: t._count } : t)));
        setEditingType(null);
        toast.success(t("requestTypeUpdateSuccess", "수정되었습니다", "Updated."));
      } else {
        setTypes([...types, { ...saved, _count: { tickets: 0 } }]);
        setIsCreateOpen(false);
        resetForm();
        toast.success(t("requestTypeSaveSuccess", "생성되었습니다", "Created."));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("requestTypeError", "오류가 발생했습니다", "An error occurred."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (type: RequestType) => {
    try {
      const response = await fetch(`/api/admin/request-types/${type.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !type.isActive }),
      });

      if (!response.ok) throw new Error(t("requestTypeStatusFailed", "상태 변경에 실패했습니다", "Failed to change status."));

      const updated = await response.json();
      setTypes(types.map((t) => (t.id === updated.id ? { ...updated, _count: t._count } : t)));
      toast.success(updated.isActive ? t("commonActivate", "활성화되었습니다", "Activated.") : t("commonDeactivate", "비활성화되었습니다", "Deactivated."));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("requestTypeError", "오류가 발생했습니다", "An error occurred."));
    }
  };

  const handleDelete = async (type: RequestType) => {
    if (!confirm(t("requestTypeDeleteConfirm", `"${type.name}"을(를) 삭제하시겠습니까?`, `Delete "${type.name}"?`))) return;

    try {
      const response = await fetch(`/api/admin/request-types/${type.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error(t("requestTypeDeleteFailed", "삭제에 실패했습니다", "Failed to delete."));

      const result = await response.json();
      
      if (result.message) {
        toast.success(result.message);
        setTypes(types.map((t) => (t.id === type.id ? { ...t, isActive: false } : t)));
      } else {
        setTypes(types.filter((t) => t.id !== type.id));
        toast.success(t("requestTypeDeleteSuccess", "삭제되었습니다", "Deleted."));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("requestTypeError", "오류가 발생했습니다", "An error occurred."));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              {t("requestTypeCreateButton", "문의 유형 추가", "Add request type")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("requestTypeNewTitle", "새 문의 유형", "New request type")}</DialogTitle>
            </DialogHeader>
            <RequestTypeForm
              formData={formData}
              setFormData={setFormData}
              teams={teams}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submitLabel={t("commonCreate", "생성", "Create")}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("commonName", "이름", "Name")}</TableHead>
            <TableHead>{t("commonChannel", "채널", "Channel")}</TableHead>
            <TableHead>{t("requestTypePriority", "기본 우선순위", "Default priority")}</TableHead>
            <TableHead>{t("requestTypeTeam", "기본 팀", "Default team")}</TableHead>
            <TableHead>{t("requestTypeAutoAssign", "자동 배정", "Auto-assign")}</TableHead>
            <TableHead>{t("requestTypeTicketCount", "티켓 수", "Ticket count")}</TableHead>
            <TableHead>{t("commonStatus", "상태", "Status")}</TableHead>
            <TableHead className="w-[100px]">{t("commonActions", "작업", "Actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {types.map((type) => (
            <TableRow key={type.id} className={!type.isActive ? "opacity-60" : ""}>
              <TableCell>
                <div>
                  <div className="font-medium">{type.name}</div>
                  {type.description && (
                    <div className="text-sm text-gray-500">{type.description}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>{channelLabels[type.channel]}</TableCell>
              <TableCell>
                <Badge variant={type.defaultPriority === "URGENT" ? "destructive" : "secondary"}>
                  {priorityLabels[type.defaultPriority]}
                </Badge>
              </TableCell>
              <TableCell>{type.defaultTeam?.name || "-"}</TableCell>
              <TableCell>{type.autoAssignEnabled ? (copy.commonYes ?? "예") : (copy.commonNo ?? "아니오")}</TableCell>
              <TableCell>{type._count.tickets}</TableCell>
              <TableCell>
                <Badge variant={type.isActive ? "default" : "secondary"}>
                  {type.isActive ? (copy.commonActive ?? "활성") : (copy.commonInactive ?? "비활성")}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(type)}
                  >
                    {type.isActive ? (
                      <Power className="w-4 h-4 text-green-500" />
                    ) : (
                      <PowerOff className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                  <Dialog open={editingType?.id === type.id} onOpenChange={() => setEditingType(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(type)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{copy.requestTypeEditTitle ?? "문의 유형 수정"}</DialogTitle>
                      </DialogHeader>
                      <RequestTypeForm
                        formData={formData}
                        setFormData={setFormData}
                        teams={teams}
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                        submitLabel={copy.commonSave ?? "저장"}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(type)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type RequestTypeFormData = {
  name: string;
  description: string;
  channel: string;
  defaultPriority: string;
  defaultTeamId: string;
  autoAssignEnabled: boolean;
  isActive: boolean;
  sortOrder: number;
};

interface RequestTypeFormProps {
  formData: RequestTypeFormData;
  setFormData: (data: RequestTypeFormData) => void;
  teams: Team[];
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  submitLabel: string;
}

function RequestTypeForm({
  formData,
  setFormData,
  teams,
  onSubmit,
  isSubmitting,
  submitLabel,
}: RequestTypeFormProps) {
  const copy = useAdminCopy();
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy, key, copy.locale === "en" ? (en ?? ko) : ko);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("commonName", "이름", "Name")} *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t("requestTypeNamePlaceholder", "예: 기술 지원", "e.g. Technical support")}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("commonDescription", "설명", "Description")}</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder={t("requestTypeDescriptionPlaceholder", "문의 유형에 대한 설명", "Description for this request type")}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("commonChannel", "채널", "Channel")}</Label>
          <Select
            value={formData.channel}
            onValueChange={(v) => setFormData({ ...formData, channel: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WEB">{t("requestTypeChannelWeb", "웹", "Web")}</SelectItem>
              <SelectItem value="EMAIL">{t("requestTypeChannelEmail", "이메일", "Email")}</SelectItem>
              <SelectItem value="API">API</SelectItem>
              <SelectItem value="IN_APP">{t("requestTypeChannelInApp", "앱 내", "In-app")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("requestTypePriority", "기본 우선순위", "Default priority")}</Label>
          <Select
            value={formData.defaultPriority}
            onValueChange={(v) => setFormData({ ...formData, defaultPriority: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="URGENT">{t("ticketsPriorityUrgent", "긴급", "Urgent")}</SelectItem>
              <SelectItem value="HIGH">{t("ticketsPriorityHigh", "높음", "High")}</SelectItem>
              <SelectItem value="MEDIUM">{t("ticketsPriorityMedium", "보통", "Medium")}</SelectItem>
              <SelectItem value="LOW">{t("ticketsPriorityLow", "낮음", "Low")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("requestTypeTeam", "기본 담당 팀", "Default team")}</Label>
        <Select
          value={formData.defaultTeamId || "none"}
          onValueChange={(v) => setFormData({ ...formData, defaultTeamId: v === "none" ? "" : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("requestTypeTeamPlaceholder", "팀 선택", "Select team")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("commonNone", "없음", "None")}</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="autoAssign"
            checked={formData.autoAssignEnabled}
            onCheckedChange={(v) => setFormData({ ...formData, autoAssignEnabled: v })}
          />
          <Label htmlFor="autoAssign">{t("requestTypeAutoAssign", "자동 배정", "Auto-assign")}</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
          />
          <Label htmlFor="isActive">{t("commonActivate", "활성화", "Activate")}</Label>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? copy.commonSaving : submitLabel}
      </Button>
    </form>
  );
}
