"use client";

import { useEffect, useState } from "react";
import { Badge } from "@suppo/ui/components/ui/badge";
import { Button } from "@suppo/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@suppo/ui/components/ui/dialog";
import { Input } from "@suppo/ui/components/ui/input";
import { Label } from "@suppo/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@suppo/ui/components/ui/select";
import { Switch } from "@suppo/ui/components/ui/switch";
import { Textarea } from "@suppo/ui/components/ui/textarea";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { copyText } from "@/lib/i18n/admin-copy-utils";

interface SLAPolicyItem {
  id: string;
  name: string;
  description: string | null;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  firstResponseHours: number;
  resolutionHours: number;
  isActive: boolean;
  _count?: { clocks: number };
}

const EMPTY_FORM = {
  name: "",
  description: "",
  priority: "MEDIUM" as SLAPolicyItem["priority"],
  firstResponseHours: 4,
  resolutionHours: 24,
  isActive: true,
};

export function SLAPolicyManager() {
  const copy = useAdminCopy();
  const t = (key: string, fallback: string) => copyText(copy, key, fallback);
  const [policies, setPolicies] = useState<SLAPolicyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    void fetchPolicies();
  }, []);

  async function fetchPolicies() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/sla-policies");
      if (!response.ok) {
        throw new Error("load failed");
      }
      const data = await response.json();
      setPolicies(data);
    } catch (error) {
      toast.error(t("slaPolicyLoadFailed", "SLA 정책을 불러오지 못했습니다."));
    } finally {
      setIsLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  }

  function openEdit(policy: SLAPolicyItem) {
    setEditingId(policy.id);
    setForm({
      name: policy.name,
      description: policy.description ?? "",
      priority: policy.priority,
      firstResponseHours: policy.firstResponseHours,
      resolutionHours: policy.resolutionHours,
      isActive: policy.isActive,
    });
    setIsDialogOpen(true);
  }

  async function savePolicy() {
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        description: form.description || undefined,
      };

      const response = await fetch(
        editingId ? `/api/admin/sla-policies/${editingId}` : "/api/admin/sla-policies",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("save failed");
      }

      toast.success(editingId ? t("slaPolicySaveSuccess", "SLA 정책이 수정되었습니다.") : t("slaPolicyCreateSuccess", "SLA 정책이 생성되었습니다."));
      setIsDialogOpen(false);
      await fetchPolicies();
    } catch (error) {
      toast.error(t("slaPolicySaveError", "SLA 정책 저장에 실패했습니다."));
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePolicy(policy: SLAPolicyItem) {
    try {
      const response = await fetch(`/api/admin/sla-policies/${policy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !policy.isActive }),
      });

      if (!response.ok) {
        throw new Error("toggle failed");
      }

      toast.success(policy.isActive ? t("slaPolicyDeactivateSuccess", "정책이 비활성화되었습니다.") : t("slaPolicyActivateSuccess", "정책이 활성화되었습니다."));
      await fetchPolicies();
    } catch (error) {
      toast.error(t("slaPolicyStatusError", "SLA 정책 상태 변경에 실패했습니다."));
    }
  }

  async function deletePolicy(policyId: string) {
    if (!window.confirm(t("slaPolicyDeleteConfirm", "이 SLA 정책을 삭제하시겠습니까?"))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/sla-policies/${policyId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("delete failed");
      }

      toast.success(t("slaPolicyDeleteSuccess", "SLA 정책이 삭제되었습니다."));
      await fetchPolicies();
    } catch (error) {
      toast.error(t("slaPolicyDeleteError", "SLA 정책 삭제에 실패했습니다."));
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("slaPolicyTitle", "SLA 정책 관리")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("slaPolicyDescription", "우선순위별 첫 응답 및 해결 목표 시간을 운영 기준으로 관리합니다.")}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("slaPolicyAdd", "정책 추가")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("slaPolicyLoading", "정책을 불러오는 중...")}</p>
        ) : policies.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("slaPolicyEmpty", "등록된 SLA 정책이 없습니다.")}</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {policies.map((policy) => (
              <Card key={policy.id} className="border-border/60">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{policy.name}</h3>
                        <Badge variant={policy.isActive ? "default" : "outline"}>
                          {policy.isActive ? t("slaPolicyActive", "활성") : t("slaPolicyInactive", "비활성")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {policy.description || t("slaPolicyNoDescription", "설명 없음")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(policy)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deletePolicy(policy.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <Metric label={t("slaPolicyPriority", "우선순위")} value={policy.priority} />
                    <Metric label={t("slaPolicyFirstResponse", "첫 응답")} value={`${policy.firstResponseHours}h`} />
                    <Metric label={t("slaPolicyResolution", "해결 목표")} value={`${policy.resolutionHours}h`} />
                  </div>
                  <div className="flex items-center justify-between border-t pt-3 text-sm text-muted-foreground">
                    <span>{t("slaPolicyClockCount", "연결된 SLA 클락")} {policy._count?.clocks ?? 0}</span>
                    <div className="flex items-center gap-2">
                      <span>{policy.isActive ? t("slaPolicyRunning", "운영중") : t("slaPolicyStopped", "중지됨")}</span>
                      <Switch checked={policy.isActive} onCheckedChange={() => togglePolicy(policy)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t("slaPolicyEditTitle", "SLA 정책 수정") : t("slaPolicyAdd", "SLA 정책 추가")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("slaPolicyName", "정책 이름")}</Label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("commonDescription", "설명")}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("slaPolicyPriority", "우선순위")}</Label>
              <Select
                value={form.priority}
                onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value as SLAPolicyItem["priority"] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="URGENT">{copy.ticketsPriorityUrgent}</SelectItem>
                  <SelectItem value="HIGH">{copy.ticketsPriorityHigh}</SelectItem>
                  <SelectItem value="MEDIUM">{copy.ticketsPriorityMedium}</SelectItem>
                  <SelectItem value="LOW">{copy.ticketsPriorityLow}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("slaPolicyFirstResponseHours", "첫 응답 시간 (시간)")}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.firstResponseHours}
                  onChange={(e) => setForm((prev) => ({ ...prev, firstResponseHours: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("slaPolicyResolutionHours", "해결 시간 (시간)")}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.resolutionHours}
                  onChange={(e) => setForm((prev) => ({ ...prev, resolutionHours: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">{t("commonActive", "활성화")}</Label>
                <p className="text-xs text-muted-foreground">{t("slaPolicyActivationHelp", "같은 우선순위의 기존 활성 정책은 자동으로 비활성화됩니다.")}</p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {copy.commonCancel}
              </Button>
              <Button onClick={savePolicy} disabled={isSaving}>
                {isSaving ? t("slaPolicySaving", "저장 중...") : copy.commonSave}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
