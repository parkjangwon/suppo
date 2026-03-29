"use client";

type WidgetButtonPreviewForm = {
  accentColor: string;
  buttonBadgeColor: string;
  buttonBadgePosition: string;
  buttonBadgeText?: string | null;
  buttonBorderColor?: string | null;
  buttonBorderWidth: number;
  buttonHoverEffect?: string;
  buttonImageFit: string;
  buttonImageUrl?: string | null;
  buttonLabel: string;
  buttonShadow: string;
  buttonShape: string;
  buttonSize: string;
  showUnreadBadge: boolean;
};

export function ChatWidgetButtonPreview({
  form,
  unreadCount = 1,
  className = "",
}: {
  form: WidgetButtonPreviewForm;
  unreadCount?: number;
  className?: string;
}) {
  const sizeMap = {
    sm: { width: 52, height: 52, image: 28, padding: 8 },
    md: { width: 64, height: 64, image: 40, padding: 10 },
    lg: { width: 76, height: 76, image: 48, padding: 14 },
  } as const;
  const size = sizeMap[form.buttonSize as keyof typeof sizeMap] ?? sizeMap.md;
  const radius =
    form.buttonShape === "circle" ? "9999px" : form.buttonShape === "rounded" ? "18px" : "9999px";
  const shadow =
    form.buttonShadow === "none"
      ? "none"
      : form.buttonShadow === "strong"
        ? "0 24px 60px rgba(15, 23, 42, 0.34)"
        : "0 18px 45px rgba(15, 23, 42, 0.24)";
  const badgePosition =
    form.buttonBadgePosition === "top-left"
      ? { top: -6, left: -6 }
      : form.buttonBadgePosition === "bottom-right"
        ? { bottom: -6, right: -6 }
        : form.buttonBadgePosition === "bottom-left"
          ? { bottom: -6, left: -6 }
          : { top: -6, right: -6 };

  const hoverClass =
    form.buttonHoverEffect === "glow"
      ? "ring-2 ring-white/20"
      : form.buttonHoverEffect === "pulse"
        ? "animate-pulse"
        : form.buttonHoverEffect === "lift"
          ? "-translate-y-1"
          : "";

  return (
    <div className={`flex items-center justify-center rounded-xl border bg-muted/20 p-8 ${className}`}>
      <div
        className={`relative flex items-center justify-center text-white transition-all ${hoverClass}`}
        style={{
          width: size.width,
          height: size.height,
          padding: size.padding,
          backgroundColor: form.accentColor,
          borderRadius: radius,
          boxShadow: shadow,
          border:
            form.buttonBorderWidth > 0
              ? `${form.buttonBorderWidth}px solid ${form.buttonBorderColor || "rgba(255,255,255,0.4)"}`
              : "none",
        }}
      >
        {form.buttonImageUrl ? (
          <img
            src={form.buttonImageUrl}
            alt={form.buttonLabel || "채팅"}
            style={{
              width: size.image,
              height: size.image,
              objectFit: form.buttonImageFit,
            }}
          />
        ) : (
          <span className="text-sm font-semibold">{form.buttonLabel || "채팅 상담"}</span>
        )}
        {(form.showUnreadBadge || form.buttonBadgeText) && (
          <span
            className="absolute inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-2 text-[11px] font-bold text-white"
            style={{
              backgroundColor: form.buttonBadgeColor || "#ef4444",
              ...badgePosition,
            }}
          >
            {form.showUnreadBadge ? String(unreadCount) : form.buttonBadgeText || "NEW"}
          </span>
        )}
      </div>
    </div>
  );
}
