// Date Range Utilities - 주간/월간 기간 계산

import { subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";
import { DateRange, ReportFrequency } from "./contracts";

// 주간 기간 계산 (월요일 시작)
export function getWeeklyPeriod(date: Date = new Date()): DateRange {
  const weekStartsOn = 1; // 월요일
  const from = startOfWeek(date, { weekStartsOn });
  const to = endOfWeek(date, { weekStartsOn });
  return { from, to };
}

// 월간 기간 계산
export function getMonthlyPeriod(date: Date = new Date()): DateRange {
  const from = startOfMonth(date);
  const to = endOfMonth(date);
  return { from, to };
}

// 지난 주 기간
export function getLastWeekPeriod(): DateRange {
  const lastWeek = subWeeks(new Date(), 1);
  return getWeeklyPeriod(lastWeek);
}

// 지난 달 기간
export function getLastMonthPeriod(): DateRange {
  const lastMonth = subMonths(new Date(), 1);
  return getMonthlyPeriod(lastMonth);
}

// N일 전부터 오늘까지
export function getLastNDays(days: number): DateRange {
  const to = new Date();
  const from = subDays(to, days);
  return { from, to };
}

// 프리셋으로 기간 계산
export function getPeriodFromPreset(preset: string): DateRange {
  switch (preset) {
    case "7d":
      return getLastNDays(7);
    case "30d":
      return getLastNDays(30);
    case "90d":
      return getLastNDays(90);
    case "this_week":
      return getWeeklyPeriod();
    case "this_month":
      return getMonthlyPeriod();
    case "last_week":
      return getLastWeekPeriod();
    case "last_month":
      return getLastMonthPeriod();
    default:
      return getLastNDays(30);
  }
}

// ReportFrequency에 따른 기간 계산
export function getPeriodForFrequency(frequency: ReportFrequency, date: Date = new Date()): DateRange {
  if (frequency === "WEEKLY") {
    return getWeeklyPeriod(date);
  }
  return getMonthlyPeriod(date);
}

// 다음 실행 시간 계산 (스케줄용)
export function getNextRunDate(
  frequency: ReportFrequency,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  hour: number,
  minute: number,
  timezone: string = "Asia/Seoul"
): Date {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);

  if (frequency === "WEEKLY" && dayOfWeek !== null) {
    const daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7;
    next.setDate(now.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
  } else if (frequency === "MONTHLY" && dayOfMonth !== null) {
    next.setDate(dayOfMonth);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  }

  return next;
}

// 기간 라벨 생성
export function getPeriodLabel(range: DateRange): string {
  const from = range.from.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  const to = range.to.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  return `${from} ~ ${to}`;
}

// 기간 키 생성 (중복 방지용)
export function generatePeriodKey(range: DateRange, frequency: ReportFrequency): string {
  const fromStr = range.from.toISOString().split("T")[0]; // YYYY-MM-DD
  const toStr = range.to.toISOString().split("T")[0];
  return `${frequency}_${fromStr}_${toStr}`;
}
