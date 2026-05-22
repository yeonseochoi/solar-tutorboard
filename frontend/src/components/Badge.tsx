import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "default" | "success" | "warning" | "danger" | "info" | "muted";

const styles: Record<Tone, string> = {
  default: "bg-secondary text-secondary-foreground border-border",
  success: "bg-[oklch(0.95_0.04_155)] text-[oklch(0.35_0.12_155)] border-[oklch(0.85_0.08_155)]",
  warning: "bg-[oklch(0.96_0.05_75)] text-[oklch(0.4_0.12_60)] border-[oklch(0.85_0.1_75)]",
  danger: "bg-[oklch(0.96_0.04_25)] text-[oklch(0.4_0.18_25)] border-[oklch(0.88_0.08_25)]",
  info: "bg-[oklch(0.95_0.04_255)] text-[oklch(0.4_0.16_255)] border-[oklch(0.85_0.08_255)]",
  muted: "bg-muted text-muted-foreground border-border",
};

export function Badge({
  tone = "default",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "paid":
    case "sent":
    case "approved":
      return "success";
    case "unpaid":
    case "rejected":
      return "danger";
    case "pending":
    case "requested":
      return "warning";
    case "available":
      return "info";
    case "cancelled":
      return "muted";
    default:
      return "default";
  }
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    paid: "결제 완료",
    unpaid: "미결제",
    pending: "대기 중",
    sent: "발송 완료",
    available: "가능",
    requested: "요청됨",
    approved: "승인",
    rejected: "거절",
    cancelled: "취소",
    lesson_report: "수업 리포트",
    payment_reminder: "결제 안내",
    schedule_coordination: "일정 조정",
  };
  return map[status] ?? status;
}
