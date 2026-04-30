import { DateRange, DatePreset } from "./contracts";

export function getDateRangeFromPreset(preset: DatePreset, customRange?: { from: Date; to: Date }): DateRange {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  let from: Date;

  switch (preset) {
    case "7d":
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      break;
    case "30d":
      from = new Date(now);
      from.setDate(from.getDate() - 30);
      break;
    case "90d":
      from = new Date(now);
      from.setDate(from.getDate() - 90);
      break;
    case "custom":
      if (!customRange) {
        throw new Error("Custom range required when preset is 'custom'");
      }
      return {
        from: new Date(customRange.from.setHours(0, 0, 0, 0)),
        to: new Date(customRange.to.setHours(23, 59, 59, 999)),
      };
    default:
      from = new Date(now);
      from.setDate(from.getDate() - 30);
  }

  from.setHours(0, 0, 0, 0);

  return { from, to };
}

export function formatDateForSQL(date: Date): string {
  return date.toISOString();
}

export function getWeekdayLabel(weekday: number): string {
  const labels = ["일", "월", "화", "수", "목", "금", "토"];
  return labels[weekday] ?? "";
}

export function getHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export function fillMissingDateBuckets<T extends { bucket: string }>(
  data: T[],
  from: Date,
  to: Date,
  granularity: "day" | "week" | "month",
  defaultValue: Omit<T, "bucket">
): T[] {
  const result: T[] = [];
  const current = new Date(from);
  const end = new Date(to);

  while (current <= end) {
    let bucket: string;
    
    if (granularity === "day") {
      bucket = current.toISOString().split("T")[0];
      const existing = data.find((d) => d.bucket === bucket);
      result.push(existing ?? ({ bucket, ...defaultValue } as T));
      current.setDate(current.getDate() + 1);
    } else if (granularity === "week") {
      const year = current.getFullYear();
      const week = getWeekNumber(current);
      bucket = `${year}-W${week.toString().padStart(2, "0")}`;
      const existing = data.find((d) => d.bucket === bucket);
      result.push(existing ?? ({ bucket, ...defaultValue } as T));
      current.setDate(current.getDate() + 7);
    } else {
      bucket = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, "0")}`;
      const existing = data.find((d) => d.bucket === bucket);
      result.push(existing ?? ({ bucket, ...defaultValue } as T));
      current.setMonth(current.getMonth() + 1);
    }
  }

  return result;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
