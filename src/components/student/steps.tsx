import Link from "next/link";
import type { LessonState, StepKey } from "@/lib/progress";
import { StatusIcon } from "@/components/ui/status";
import { cn, pad2 } from "@/lib/utils";

export const STEP_LABEL: Record<StepKey, string> = {
  lecture: "Лекция",
  practice: "Практика",
  quiz: "Тест",
  hotkeys: "Горячие клавиши",
};

/** Compact horizontal step strip used in TODAY and lesson rows. */
export function StepStrip({ state, meta }: { state: LessonState; meta?: Partial<Record<StepKey, string>> }) {
  return (
    <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
      {state.steps.map((step, i) => {
        const isNext = state.next?.key === step.key;
        return (
          <li key={step.key} className="bg-surface">
            <Link
              href={step.href}
              className={cn(
                "group flex h-full flex-col gap-2 px-3.5 py-3 transition-colors hover:bg-muted",
                isNext && "bg-accent-soft/60 hover:bg-accent-soft",
              )}
            >
              <span className="flex items-center justify-between">
                <span className={cn("font-mono text-xs", isNext ? "text-accent" : "text-fg-3")}>{pad2(i + 1)}</span>
                <StatusIcon status={step.state} />
              </span>
              <span>
                <span className="block text-sm font-medium text-fg">{STEP_LABEL[step.key]}</span>
                {meta?.[step.key] && <span className="block text-xs text-fg-3">{meta[step.key]}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
