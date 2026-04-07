import type { AdminCopy } from "@crinity/shared/i18n/admin-copy";

export function copyText(copy: AdminCopy, key: string, fallback: string): string {
  return (copy as Record<string, string>)[key] ?? fallback;
}
