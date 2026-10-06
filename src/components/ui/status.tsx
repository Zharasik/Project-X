import type { LessonStatus, StepState } from "@/lib/progress";
import { cn } from "@/lib/utils";

type Status = LessonStatus | StepState | "locked";

const LABEL: Record<Status, string> = {
  not_started: "Не начато",
  todo: "Не начато",
  in_progress: "В процессе",
  completed: "Завершено",
  done: "Выполнено",
  locked: "Недоступно",
};

/** ○ ◐ ✓ 🔒 drawn as crisp 16px SVGs */
export function StatusIcon({ status, className }: { status: Status; className?: string }) {
  const cls = cn("size-4 shrink-0", className);
  if (status === "completed" || status === "done") {
    return (
      <svg viewBox="0 0 16 16" className={cn(cls, "text-success")} aria-label={LABEL[status]}>
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M5 8.2l2 2 4-4.4" fill="none" stroke="var(--surface)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "in_progress") {
    return (
      <svg viewBox="0 0 16 16" className={cn(cls, "text-accent")} aria-label={LABEL[status]}>
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 3.5a4.5 4.5 0 0 1 0 9z" fill="currentColor" />
      </svg>
    );
  }
  if (status === "locked") {
    return (
      <svg viewBox="0 0 16 16" className={cn(cls, "text-fg-3")} aria-label={LABEL[status]}>
        <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className={cn(cls, "text-fg-3")} aria-label={LABEL[status]}>
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function statusLabel(status: Status) {
  return LABEL[status];
}
