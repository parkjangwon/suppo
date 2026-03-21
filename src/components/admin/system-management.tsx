"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Upload, RotateCcw, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ResetCategory = "tickets" | "agents" | "settings" | "knowledge" | "audit_logs";

const CATEGORY_LABELS: Record<ResetCategory, string> = {
  tickets: "티켓 및 고객 데이터",
  agents: "상담원 계정",
  settings: "설정",
  knowledge: "지식 베이스",
  audit_logs: "감사 로그",
};

/** agents 선택 시 tickets/knowledge/settings 강제, settings 선택 시 tickets 강제 */
function enforceDependencies(
  prev: Set<ResetCategory>,
  toggled: ResetCategory,
  checked: boolean
): Set<ResetCategory> {
  const next = new Set(prev);
  if (checked) {
    next.add(toggled);
    if (toggled === "agents") {
      next.add("tickets");
      next.add("knowledge");
      next.add("settings");
    }
    if (toggled === "settings") {
      next.add("tickets");
    }
  } else {
    next.delete(toggled);
    // 의존성 역방향 해제
    if (toggled === "tickets") {
      next.delete("agents");
      next.delete("settings");
    }
    if (toggled === "settings") {
      next.delete("agents");
    }
    if (toggled === "knowledge") {
      next.delete("agents");
    }
  }
  return next;
}

export function SystemManagement() {
  // ── 백업 ────────────────────────────────────────────────────
  const [backupLoading, setBackupLoading] = useState(false);

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await fetch("/api/admin/system/backup");
      if (!res.ok) throw new Error("백업 실패");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename =
        res.headers
          .get("content-disposition")
          ?.match(/filename="(.+)"/)?.[1] ?? "backup.zip";
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("백업 파일이 다운로드되었습니다.");
    } catch (err) {
      toast.error("백업 실패: " + (err instanceof Error ? err.message : "오류"));
    } finally {
      setBackupLoading(false);
    }
  };

  // ── 복구 ────────────────────────────────────────────────────
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  const handleRestore = async () => {
    if (!restoreFile) return;
    setRestoreLoading(true);
    setRestoreDialogOpen(false);
    try {
      const formData = new FormData();
      formData.append("file", restoreFile);
      const res = await fetch("/api/admin/system/restore", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "복구 실패");
      if (!json.schemaVersionMatch) {
        toast.warning("스키마 버전이 다릅니다. 복구는 완료되었지만 일부 데이터에 문제가 있을 수 있습니다.");
      } else {
        toast.success("복구가 완료되었습니다. 로그인 화면으로 이동합니다.");
      }
      setTimeout(() => {
        window.location.href = "/admin/login";
      }, 2000);
    } catch (err) {
      toast.error("복구 실패: " + (err instanceof Error ? err.message : "오류"));
    } finally {
      setRestoreLoading(false);
    }
  };

  // ── 초기화 ──────────────────────────────────────────────────
  const [selectedCategories, setSelectedCategories] = useState<Set<ResetCategory>>(
    new Set()
  );
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const allSelected =
    selectedCategories.size ===
    (Object.keys(CATEGORY_LABELS) as ResetCategory[]).length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(
        new Set(Object.keys(CATEGORY_LABELS) as ResetCategory[])
      );
    }
  };

  const toggleCategory = (cat: ResetCategory, checked: boolean) => {
    setSelectedCategories((prev) => enforceDependencies(prev, cat, checked));
  };

  const handleReset = async () => {
    setResetLoading(true);
    setResetDialogOpen(false);
    setConfirmText("");
    try {
      const res = await fetch("/api/admin/system/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: [...selectedCategories] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "초기화 실패");
      toast.success("초기화가 완료되었습니다.");
      setSelectedCategories(new Set());
      window.location.reload();
    } catch (err) {
      toast.error("초기화 실패: " + (err instanceof Error ? err.message : "오류"));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 백업 카드 ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            데이터 백업
          </CardTitle>
          <CardDescription>
            현재 모든 데이터와 첨부파일을 ZIP 파일로 다운로드합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleBackup} disabled={backupLoading}>
            {backupLoading ? "백업 생성 중..." : "백업 다운로드"}
          </Button>
        </CardContent>
      </Card>

      {/* ── 복구 카드 ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            데이터 복구
          </CardTitle>
          <CardDescription>
            백업 파일을 업로드하면 현재 모든 데이터가 교체됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              복구 시 현재 데이터가 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDescription>
          </Alert>
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept=".zip"
              onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
              className="max-w-xs"
            />
            <Button
              variant="destructive"
              disabled={!restoreFile || restoreLoading}
              onClick={() => setRestoreDialogOpen(true)}
            >
              {restoreLoading ? "복구 중..." : "복구 시작"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 초기화 카드 ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            시스템 초기화
          </CardTitle>
          <CardDescription>
            선택한 항목을 초기 설치 상태로 되돌립니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              선택한 데이터가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={(checked) => {
                  if (checked !== "indeterminate") toggleAll();
                }}
              />
              <Label htmlFor="select-all" className="font-medium">
                모두 선택
              </Label>
            </div>
            <div className="ml-6 space-y-2">
              {(Object.entries(CATEGORY_LABELS) as [ResetCategory, string][]).map(
                ([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`cat-${key}`}
                      checked={selectedCategories.has(key)}
                      onCheckedChange={(checked) => {
                        if (checked !== "indeterminate")
                          toggleCategory(key, !!checked);
                      }}
                    />
                    <Label htmlFor={`cat-${key}`}>{label}</Label>
                  </div>
                )
              )}
            </div>
            {selectedCategories.has("agents") && (
              <p className="text-sm text-muted-foreground ml-6">
                * '상담원 계정' 초기화는 '티켓 및 고객 데이터', '지식 베이스', '설정'도 함께 초기화합니다.
              </p>
            )}
            {!selectedCategories.has("agents") && selectedCategories.has("settings") && (
              <p className="text-sm text-muted-foreground ml-6">
                * '설정' 초기화는 '티켓 및 고객 데이터'도 함께 초기화합니다.
              </p>
            )}
          </div>

          <Button
            variant="destructive"
            disabled={selectedCategories.size === 0 || resetLoading}
            onClick={() => setResetDialogOpen(true)}
          >
            {resetLoading ? "초기화 중..." : "초기화"}
          </Button>
        </CardContent>
      </Card>

      {/* ── 복구 확인 다이얼로그 ──────────────────────────── */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>데이터 복구 확인</DialogTitle>
            <DialogDescription>
              현재 모든 데이터가 백업 파일의 데이터로 교체됩니다. 이 작업은
              되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleRestore}>
              복구 시작
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 초기화 확인 다이얼로그 ───────────────────────── */}
      <Dialog open={resetDialogOpen} onOpenChange={(open) => {
        setResetDialogOpen(open);
        if (!open) setConfirmText("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              선택한 데이터가 영구 삭제됩니다
            </DialogTitle>
            <DialogDescription>
              계속하려면 아래에 <strong>초기화</strong>를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="초기화"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetDialogOpen(false);
                setConfirmText("");
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "초기화"}
              onClick={handleReset}
            >
              초기화 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
