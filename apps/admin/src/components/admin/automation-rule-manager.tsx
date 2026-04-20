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

interface AutomationRuleItem {
  id: string;
  name: string;
  description: string | null;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  isActive: boolean;
  priority: number;
  triggerOn: string;
}

interface AutomationRuleManagerProps {
  agents: { id: string; name: string }[];
  teams: { id: string; name: string }[];
}

const EMPTY_FORM = {
  name: "",
  description: "",
  triggerOn: "TICKET_CREATED",
  priority: 100,
  conditionStatus: "",
  conditionPriority: "",
  conditionCustomerEmail: "",
  conditionKeywords: "",
  conditionSlaState: "",
  conditionCreatedHoursAgo: "",
  conditionUpdatedHoursAgo: "",
  actionStatus: "",
  actionPriority: "",
  actionAssigneeId: "",
  actionTeamId: "",
  actionAddTags: "",
  sendNotification: false,
  isActive: true,
};

export function AutomationRuleManager({ agents, teams }: AutomationRuleManagerProps) {
  const copy = useAdminCopy();
  const t = (key: string, fallback: string) => copyText(copy, key, fallback);
  const [rules, setRules] = useState<AutomationRuleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    void fetchRules();
  }, []);

  async function fetchRules() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/automation-rules");
      if (!response.ok) {
        throw new Error("load failed");
      }
      const data = await response.json();
      setRules(data);
    } catch (error) {
      toast.error(t("automationLoadFailed", "자동화 규칙을 불러오지 못했습니다."));
    } finally {
      setIsLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  }

  function openEdit(rule: AutomationRuleItem) {
    const conditions = rule.conditions ?? {};
    const actions = rule.actions ?? {};

    setEditingId(rule.id);
    setForm({
      name: rule.name,
      description: rule.description ?? "",
      triggerOn: rule.triggerOn,
      priority: rule.priority,
      conditionStatus: String(conditions.status ?? ""),
      conditionPriority: String(conditions.priority ?? ""),
      conditionCustomerEmail: String(conditions.customerEmail ?? ""),
      conditionKeywords: Array.isArray(conditions.keywords) ? conditions.keywords.join(", ") : "",
      conditionSlaState: String(conditions.slaState ?? ""),
      conditionCreatedHoursAgo:
        typeof conditions.createdHoursAgo === "number" ? String(conditions.createdHoursAgo) : "",
      conditionUpdatedHoursAgo:
        typeof conditions.updatedHoursAgo === "number" ? String(conditions.updatedHoursAgo) : "",
      actionStatus: String(actions.setStatus ?? ""),
      actionPriority: String(actions.setPriority ?? ""),
      actionAssigneeId: String(actions.setAssigneeId ?? ""),
      actionTeamId: String(actions.setTeamId ?? ""),
      actionAddTags: Array.isArray(actions.addTags) ? actions.addTags.join(", ") : "",
      sendNotification: Boolean(actions.sendNotification),
      isActive: rule.isActive,
    });
    setIsDialogOpen(true);
  }

  async function saveRule() {
    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        triggerOn: form.triggerOn,
        priority: form.priority,
        isActive: form.isActive,
        conditions: {
          ...(form.conditionStatus ? { status: form.conditionStatus } : {}),
          ...(form.conditionPriority ? { priority: form.conditionPriority } : {}),
          ...(form.conditionCustomerEmail ? { customerEmail: form.conditionCustomerEmail } : {}),
          ...(form.conditionKeywords
            ? {
                keywords: form.conditionKeywords
                  .split(",")
                  .map((keyword) => keyword.trim())
                  .filter(Boolean),
              }
            : {}),
          ...(form.conditionSlaState ? { slaState: form.conditionSlaState } : {}),
          ...(form.conditionCreatedHoursAgo
            ? { createdHoursAgo: Number(form.conditionCreatedHoursAgo) }
            : {}),
          ...(form.conditionUpdatedHoursAgo
            ? { updatedHoursAgo: Number(form.conditionUpdatedHoursAgo) }
            : {}),
        },
        actions: {
          ...(form.actionStatus ? { setStatus: form.actionStatus } : {}),
          ...(form.actionPriority ? { setPriority: form.actionPriority } : {}),
          ...(form.actionAssigneeId
            ? { setAssigneeId: form.actionAssigneeId === "unassigned" ? null : form.actionAssigneeId }
            : {}),
          ...(form.actionTeamId ? { setTeamId: form.actionTeamId } : {}),
          ...(form.actionAddTags
            ? {
                addTags: form.actionAddTags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              }
            : {}),
          ...(form.sendNotification ? { sendNotification: true } : {}),
        },
      };

      const response = await fetch(
        editingId ? `/api/admin/automation-rules/${editingId}` : "/api/admin/automation-rules",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("save failed");
      }

      toast.success(editingId ? t("automationUpdateSuccess", "자동화 규칙이 수정되었습니다.") : t("automationCreateSuccess", "자동화 규칙이 생성되었습니다."));
      setIsDialogOpen(false);
      await fetchRules();
    } catch (error) {
      toast.error(t("automationSaveFailed", "자동화 규칙 저장에 실패했습니다."));
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleRule(rule: AutomationRuleItem) {
    try {
      const response = await fetch(`/api/admin/automation-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });

      if (!response.ok) {
        throw new Error("toggle failed");
      }

      toast.success(rule.isActive ? t("automationDeactivateSuccess", "규칙이 비활성화되었습니다.") : t("automationActivateSuccess", "규칙이 활성화되었습니다."));
      await fetchRules();
    } catch (error) {
      toast.error(t("automationStatusFailed", "자동화 규칙 상태 변경에 실패했습니다."));
    }
  }

  async function deleteRule(ruleId: string) {
    if (!window.confirm(t("automationDeleteConfirm", "이 자동화 규칙을 삭제하시겠습니까?"))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/automation-rules/${ruleId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("delete failed");
      }

      toast.success(t("automationDeleteSuccess", "자동화 규칙이 삭제되었습니다."));
      await fetchRules();
    } catch (error) {
      toast.error(t("automationDeleteFailed", "자동화 규칙 삭제에 실패했습니다."));
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("automationTitle", "자동화 규칙 관리")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("automationDescription", "트리거와 조건에 따라 티켓 상태, 우선순위, 담당자, 태그, 알림을 자동으로 제어합니다.")}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("automationAdd", "규칙 추가")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("automationLoading", "자동화 규칙을 불러오는 중...")}</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("automationEmpty", "등록된 자동화 규칙이 없습니다.")}</p>
        ) : (
          <div className="grid gap-4">
            {rules.map((rule) => (
              <Card key={rule.id} className="border-border/60">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{rule.name}</h3>
                        <Badge variant={rule.isActive ? "default" : "outline"}>
                          {rule.isActive ? copyText(copy, "commonActive", "활성") : copyText(copy, "commonInactive", "비활성")}
                        </Badge>
                        <Badge variant="outline">{rule.triggerOn}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rule.description || t("automationNoDescription", "설명 없음")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <RuleSection title={t("automationConditions", "조건")} values={summarizeConditions(rule.conditions)} />
                    <RuleSection title={t("automationActions", "동작")} values={summarizeActions(rule.actions, agents, teams)} />
                  </div>
                  <div className="flex items-center justify-between border-t pt-3 text-sm text-muted-foreground">
                    <span>{t("slaPolicyPriority", "우선순위")} {rule.priority}</span>
                    <div className="flex items-center gap-2">
                      <span>{rule.isActive ? copyText(copy, "slaPolicyRunning", "운영중") : copyText(copy, "slaPolicyStopped", "중지됨")}</span>
                      <Switch checked={rule.isActive} onCheckedChange={() => toggleRule(rule)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t("automationEditTitle", "자동화 규칙 수정") : t("automationAdd", "자동화 규칙 추가")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>{t("automationRuleName", "규칙 이름")}</Label>
              <Input
                aria-label={t("automationRuleNameAriaLabel", "규칙 이름")}
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{copyText(copy, "commonDescription", "설명")}</Label>
              <Textarea
                aria-label={t("automationDescriptionAriaLabel", "설명")}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>트리거</Label>
              <Select value={form.triggerOn} onValueChange={(value) => setForm((prev) => ({ ...prev, triggerOn: value }))}>
                <SelectTrigger aria-label="트리거"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TICKET_CREATED">티켓 생성</SelectItem>
                  <SelectItem value="TICKET_UPDATED">티켓 수정</SelectItem>
                  <SelectItem value="TICKET_ASSIGNED">담당자 배정</SelectItem>
                  <SelectItem value="SCHEDULED">스케줄 실행</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>실행 우선순위</Label>
              <Input
                aria-label="실행 우선순위"
                type="number"
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>조건 상태</Label>
              <Select value={form.conditionStatus || "any"} onValueChange={(value) => setForm((prev) => ({ ...prev, conditionStatus: value === "any" ? "" : value }))}>
                <SelectTrigger aria-label="조건 상태"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">모든 상태</SelectItem>
                  <SelectItem value="OPEN">열림</SelectItem>
                  <SelectItem value="IN_PROGRESS">진행중</SelectItem>
                  <SelectItem value="WAITING">대기중</SelectItem>
                  <SelectItem value="RESOLVED">해결됨</SelectItem>
                  <SelectItem value="CLOSED">닫힘</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>조건 우선순위</Label>
              <Select value={form.conditionPriority || "any"} onValueChange={(value) => setForm((prev) => ({ ...prev, conditionPriority: value === "any" ? "" : value }))}>
                <SelectTrigger aria-label="조건 우선순위"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">모든 우선순위</SelectItem>
                  <SelectItem value="URGENT">긴급</SelectItem>
                  <SelectItem value="HIGH">높음</SelectItem>
                  <SelectItem value="MEDIUM">보통</SelectItem>
                  <SelectItem value="LOW">낮음</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>고객 이메일 조건</Label>
              <Input
                aria-label="고객 이메일 조건"
                value={form.conditionCustomerEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, conditionCustomerEmail: e.target.value }))}
                placeholder="예: .*@enterprise.com"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>키워드 조건</Label>
              <Input
                aria-label="키워드 조건"
                value={form.conditionKeywords}
                onChange={(e) => setForm((prev) => ({ ...prev, conditionKeywords: e.target.value }))}
                placeholder="예: 결제, 장애, 환불"
              />
            </div>
            <div className="space-y-2">
              <Label>SLA 상태</Label>
              <Select
                value={form.conditionSlaState || "any"}
                onValueChange={(value) => setForm((prev) => ({ ...prev, conditionSlaState: value === "any" ? "" : value }))}
              >
                <SelectTrigger aria-label="SLA 상태"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">사용 안 함</SelectItem>
                  <SelectItem value="warning">임박</SelectItem>
                  <SelectItem value="breached">위반</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>생성 후 경과 시간(시간)</Label>
              <Input
                aria-label="생성 후 경과 시간(시간)"
                type="number"
                min="0"
                step="1"
                value={form.conditionCreatedHoursAgo}
                onChange={(e) => setForm((prev) => ({ ...prev, conditionCreatedHoursAgo: e.target.value }))}
                placeholder="예: 24"
              />
            </div>
            <div className="space-y-2">
              <Label>업데이트 후 경과 시간(시간)</Label>
              <Input
                aria-label="업데이트 후 경과 시간(시간)"
                type="number"
                min="0"
                step="1"
                value={form.conditionUpdatedHoursAgo}
                onChange={(e) => setForm((prev) => ({ ...prev, conditionUpdatedHoursAgo: e.target.value }))}
                placeholder="예: 24"
              />
            </div>
            <div className="space-y-2">
              <Label>상태 변경</Label>
              <Select value={form.actionStatus || "none"} onValueChange={(value) => setForm((prev) => ({ ...prev, actionStatus: value === "none" ? "" : value }))}>
                <SelectTrigger aria-label="상태 변경"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">변경 안 함</SelectItem>
                  <SelectItem value="OPEN">열림</SelectItem>
                  <SelectItem value="IN_PROGRESS">진행중</SelectItem>
                  <SelectItem value="WAITING">대기중</SelectItem>
                  <SelectItem value="RESOLVED">해결됨</SelectItem>
                  <SelectItem value="CLOSED">닫힘</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>우선순위 변경</Label>
              <Select value={form.actionPriority || "none"} onValueChange={(value) => setForm((prev) => ({ ...prev, actionPriority: value === "none" ? "" : value }))}>
                <SelectTrigger aria-label="우선순위 변경"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">변경 안 함</SelectItem>
                  <SelectItem value="URGENT">긴급</SelectItem>
                  <SelectItem value="HIGH">높음</SelectItem>
                  <SelectItem value="MEDIUM">보통</SelectItem>
                  <SelectItem value="LOW">낮음</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>담당자 재배정</Label>
              <Select value={form.actionAssigneeId || "none"} onValueChange={(value) => setForm((prev) => ({ ...prev, actionAssigneeId: value === "none" ? "" : value }))}>
                <SelectTrigger aria-label="담당자 재배정"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">변경 안 함</SelectItem>
                  <SelectItem value="unassigned">미할당</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>팀 재지정</Label>
              <Select value={form.actionTeamId || "none"} onValueChange={(value) => setForm((prev) => ({ ...prev, actionTeamId: value === "none" ? "" : value }))}>
                <SelectTrigger aria-label="팀 재지정"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">변경 안 함</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>추가 태그</Label>
              <Input
                aria-label="추가 태그"
                value={form.actionAddTags}
                onChange={(e) => setForm((prev) => ({ ...prev, actionAddTags: e.target.value }))}
                placeholder="예: vip, urgent-followup"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
              <div>
                <Label className="text-sm">이메일 알림 발송</Label>
                <p className="text-xs text-muted-foreground">규칙 실행 시 고객에게 자동 안내 메일을 보냅니다.</p>
              </div>
              <Switch checked={form.sendNotification} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, sendNotification: checked }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
              <div>
                <Label className="text-sm">규칙 활성화</Label>
                <p className="text-xs text-muted-foreground">비활성화하면 저장만 하고 실행하지 않습니다.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))} />
            </div>
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={saveRule} disabled={isSaving}>
                {isSaving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function RuleSection({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-lg bg-muted/30 p-4">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="mt-2 space-y-1 text-sm">
        {values.length > 0 ? values.map((value) => <div key={value}>{value}</div>) : <div className="text-muted-foreground">설정 없음</div>}
      </div>
    </div>
  );
}

function summarizeConditions(conditions: Record<string, unknown>) {
  const result: string[] = [];

  if (conditions.status) result.push(`상태: ${conditions.status}`);
  if (conditions.priority) result.push(`우선순위: ${conditions.priority}`);
  if (conditions.slaState === "warning") result.push("SLA 상태: 임박");
  if (conditions.slaState === "breached") result.push("SLA 상태: 위반");
  if (conditions.customerEmail) result.push(`이메일 패턴: ${conditions.customerEmail}`);
  if (typeof conditions.createdHoursAgo === "number") {
    result.push(`생성 후 경과: ${conditions.createdHoursAgo}시간 이상`);
  }
  if (typeof conditions.updatedHoursAgo === "number") {
    result.push(`업데이트 후 경과: ${conditions.updatedHoursAgo}시간 이상`);
  }
  if (Array.isArray(conditions.keywords) && conditions.keywords.length > 0) {
    result.push(`키워드: ${conditions.keywords.join(", ")}`);
  }

  return result;
}

function summarizeActions(
  actions: Record<string, unknown>,
  agents: { id: string; name: string }[],
  teams: { id: string; name: string }[]
) {
  const result: string[] = [];

  if (actions.setStatus) result.push(`상태 변경: ${actions.setStatus}`);
  if (actions.setPriority) result.push(`우선순위 변경: ${actions.setPriority}`);
  if (actions.setAssigneeId !== undefined) {
    if (actions.setAssigneeId === null) {
      result.push("담당자 해제");
    } else {
      const agentName = agents.find((agent) => agent.id === actions.setAssigneeId)?.name ?? String(actions.setAssigneeId);
      result.push(`담당자 재배정: ${agentName}`);
    }
  }
  if (actions.setTeamId) {
    const teamName = teams.find((team) => team.id === actions.setTeamId)?.name ?? String(actions.setTeamId);
    result.push(`팀 재지정: ${teamName}`);
  }
  if (Array.isArray(actions.addTags) && actions.addTags.length > 0) {
    result.push(`태그 추가: ${actions.addTags.join(", ")}`);
  }
  if (actions.sendNotification) {
    result.push("이메일 알림 발송");
  }

  return result;
}
