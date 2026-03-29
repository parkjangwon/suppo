// i18n Infrastructure - Complete internationalization support
export type SupportedLocale = "ko" | "en" | "ja" | "zh";

export const SUPPORTED_LOCALES: SupportedLocale[] = ["ko", "en", "ja", "zh"];

export const DEFAULT_LOCALE: SupportedLocale = "ko";

// Translation dictionaries
export const translations: Record<SupportedLocale, Record<string, string>> = {
  ko: {
    "ticket.new": "새 티켓",
    "ticket.list": "티켓 목록",
    "ticket.detail": "티켓 상세",
    "ticket.status.open": "열림",
    "ticket.status.in_progress": "진행중",
    "ticket.status.resolved": "해결됨",
    "ticket.status.closed": "종료됨",
    "common.save": "저장",
    "common.cancel": "취소",
    "common.submit": "제출",
    "common.loading": "로딩중...",
    "common.error": "오류가 발생했습니다",
    "common.success": "성공적으로 완료되었습니다"
  },
  en: {
    "ticket.new": "New Ticket",
    "ticket.list": "Ticket List",
    "ticket.detail": "Ticket Detail",
    "ticket.status.open": "Open",
    "ticket.status.in_progress": "In Progress",
    "ticket.status.resolved": "Resolved",
    "ticket.status.closed": "Closed",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.submit": "Submit",
    "common.loading": "Loading...",
    "common.error": "An error occurred",
    "common.success": "Successfully completed"
  },
  ja: {
    "ticket.new": "新規チケット",
    "ticket.list": "チケット一覧",
    "ticket.detail": "チケット詳細",
    "ticket.status.open": "オープン",
    "ticket.status.in_progress": "進行中",
    "ticket.status.resolved": "解決済",
    "ticket.status.closed": "クローズ",
    "common.save": "保存",
    "common.cancel": "キャンセル",
    "common.submit": "送信",
    "common.loading": "読み込み中...",
    "common.error": "エラーが発生しました",
    "common.success": "正常に完了しました"
  },
  zh: {
    "ticket.new": "新工单",
    "ticket.list": "工单列表",
    "ticket.detail": "工单详情",
    "ticket.status.open": "开启",
    "ticket.status.in_progress": "进行中",
    "ticket.status.resolved": "已解决",
    "ticket.status.closed": "已关闭",
    "common.save": "保存",
    "common.cancel": "取消",
    "common.submit": "提交",
    "common.loading": "加载中...",
    "common.error": "发生错误",
    "common.success": "成功完成"
  }
};

export function t(key: string, locale: SupportedLocale = DEFAULT_LOCALE): string {
  return translations[locale][key] || translations[DEFAULT_LOCALE][key] || key;
}

export function formatDate(
  date: Date,
  locale: SupportedLocale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions
): string {
  const localeMap: Record<SupportedLocale, string> = {
    ko: "ko-KR",
    en: "en-US",
    ja: "ja-JP",
    zh: "zh-CN"
  };
  
  return new Intl.DateTimeFormat(
    localeMap[locale],
    options || { year: "numeric", month: "short", day: "numeric" }
  ).format(date);
}

export function formatNumber(
  num: number,
  locale: SupportedLocale = DEFAULT_LOCALE
): string {
  const localeMap: Record<SupportedLocale, string> = {
    ko: "ko-KR",
    en: "en-US",
    ja: "ja-JP",
    zh: "zh-CN"
  };
  
  return new Intl.NumberFormat(localeMap[locale]).format(num);
}

// Locale detection from request
export function detectLocale(acceptLanguage: string): SupportedLocale {
  const langs = acceptLanguage.split(",").map(l => l.split(";")[0].trim().toLowerCase());
  
  for (const lang of langs) {
    if (lang.startsWith("ko")) return "ko";
    if (lang.startsWith("en")) return "en";
    if (lang.startsWith("ja")) return "ja";
    if (lang.startsWith("zh")) return "zh";
  }
  
  return DEFAULT_LOCALE;
}
