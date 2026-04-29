"use client";

import { useState, useEffect } from "react";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { Button } from "@suppo/ui/components/ui/button";
import { Input } from "@suppo/ui/components/ui/input";
import { Label } from "@suppo/ui/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@suppo/ui/components/ui/select";
import { Switch } from "@suppo/ui/components/ui/switch";
import { Badge } from "@suppo/ui/components/ui/badge";
import { Loader2, Clock, CalendarDays, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TIMEZONES = [
  { value: "Asia/Seoul", label: "서울 (UTC+9)" },
  { value: "Asia/Tokyo", label: "도쿄 (UTC+9)" },
  { value: "Asia/Shanghai", label: "상하이 (UTC+8)" },
  { value: "Asia/Singapore", label: "싱가포르 (UTC+8)" },
  { value: "UTC", label: "UTC (UTC+0)" },
  { value: "Europe/London", label: "런던 (UTC+0/+1)" },
  { value: "Europe/Paris", label: "파리 (UTC+1/+2)" },
  { value: "America/New_York", label: "뉴욕 (UTC-5/-4)" },
  { value: "America/Los_Angeles", label: "로스앤젤레스 (UTC-8/-7)" },
];

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

interface Holiday {
  id?: string;
  name: string;
  date: string;
  isRecurring: boolean;
}

interface BusinessHoursData {
  timezone: string;
  workStartHour: number;
  workEndHour: number;
  workDays: number[];
  holidays: Holiday[];
}

export function BusinessHoursForm() {
  const copy = useAdminCopy() as Record<string, string>;
  const [data, setData] = useState<BusinessHoursData>({
    timezone: "Asia/Seoul",
    workStartHour: 9,
    workEndHour: 18,
    workDays: [1, 2, 3, 4, 5],
    holidays: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newHoliday, setNewHoliday] = useState<Holiday>({
    name: "",
    date: "",
    isRecurring: false,
  });

  useEffect(() => {
    fetch("/api/admin/settings/business-hours")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => toast.error(copy.businessHoursLoadFailed ?? "설정을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleWorkDay = (day: number) => {
    setData((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter((d) => d !== day)
        : [...prev.workDays, day].sort((a, b) => a - b),
    }));
  };

  const addHoliday = () => {
    if (!newHoliday.name.trim() || !newHoliday.date) {
      toast.error(copy.businessHoursHolidayRequired ?? "휴일 이름과 날짜를 입력해 주세요.");
      return;
    }
    setData((prev) => ({
      ...prev,
      holidays: [...prev.holidays, { ...newHoliday }],
    }));
    setNewHoliday({ name: "", date: "", isRecurring: false });
  };

  const removeHoliday = (index: number) => {
    setData((prev) => ({
      ...prev,
      holidays: prev.holidays.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (data.workDays.length === 0) {
      toast.error(copy.businessHoursWorkDayRequired ?? "최소 하나 이상의 근무일을 선택해 주세요.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings/business-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast.success(copy.businessHoursSaveSuccess ?? "영업시간 설정이 저장되었습니다.");
    } catch {
      toast.error(copy.businessHoursSaveFailed ?? "저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 시간대 */}
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
            {copy.businessHoursTitle ?? "시간대 및 근무 시간"}
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{copy.businessHoursTimezone ?? "시간대"}</Label>
            <Select
              value={data.timezone}
              onValueChange={(v) => setData((prev) => ({ ...prev, timezone: v }))}
            >
              <SelectTrigger className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label>{copy.businessHoursWorkStart ?? "업무 시작 시간"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={data.workStartHour}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, workStartHour: Number(e.target.value) }))
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">시</span>
              </div>
            </div>
            <span className="mt-6 text-muted-foreground">~</span>
            <div className="space-y-2">
              <Label>{copy.businessHoursWorkEnd ?? "업무 종료 시간"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={data.workEndHour}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, workEndHour: Number(e.target.value) }))
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">시</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{copy.businessHoursWorkDays ?? "근무일"}</Label>
            <div className="flex gap-2">
              {DAY_LABELS.map((label, day) => {
                const active = data.workDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWorkDay(day)}
                    className={`h-9 w-9 rounded-full text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-input bg-background hover:bg-accent"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 휴일 관리 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            {copy.businessHoursHolidays ?? "공휴일 / 휴무일"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.holidays.length > 0 && (
            <div className="space-y-2">
              {data.holidays.map((holiday, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{holiday.name}</span>
                    <span className="text-sm text-muted-foreground">{holiday.date}</span>
                    {holiday.isRecurring && (
                      <Badge variant="secondary" className="text-xs">{copy.businessHoursRecurring ?? "매년 반복"}</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHoliday(idx)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 pt-2 border-t">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">{copy.businessHoursHolidayName ?? "휴일 이름"}</Label>
              <Input
                value={newHoliday.name}
                onChange={(e) => setNewHoliday((p) => ({ ...p, name: e.target.value }))}
                placeholder="예: 광복절"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{copy.businessHoursDate ?? "날짜"}</Label>
              <Input
                type="date"
                value={newHoliday.date}
                onChange={(e) => setNewHoliday((p) => ({ ...p, date: e.target.value }))}
                className="h-9 w-40"
              />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Switch
                checked={newHoliday.isRecurring}
                onCheckedChange={(v) => setNewHoliday((p) => ({ ...p, isRecurring: v }))}
                id="recurring"
              />
              <Label htmlFor="recurring" className="text-xs cursor-pointer">{copy.businessHoursRecurring ?? "매년 반복"}</Label>
            </div>
            <Button variant="outline" size="sm" onClick={addHoliday} className="h-9">
              <Plus className="h-4 w-4 mr-1" />
              {copy.commonAdd ?? "추가"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isSaving ? copy.commonSaving ?? "저장 중..." : copy.commonSaveSettings ?? "저장"}
        </Button>
      </div>
    </div>
  );
}
