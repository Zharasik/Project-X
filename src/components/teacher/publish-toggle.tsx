"use client";

import { useOptimistic, useTransition } from "react";
import { setPublished } from "@/lib/actions/teacher";
import { cn } from "@/lib/utils";

export function PublishToggle({ kind, id, published }: { kind: "course" | "module" | "lesson"; id: string; published: boolean }) {
  const [value, setValue] = useOptimistic(published);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          setValue(!value);
          await setPublished(kind, id, !value);
        })
      }
      title={value ? "Опубликовано — нажмите, чтобы скрыть" : "Черновик — нажмите, чтобы опубликовать"}
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap transition-colors",
        value ? "bg-success-soft text-success hover:opacity-80" : "bg-muted text-fg-3 hover:text-fg-2",
      )}
    >
      <span className={cn("size-1.5 rounded-full", value ? "bg-success" : "bg-fg-3")} />
      <span className="hidden sm:inline">{value ? "Опубликовано" : "Черновик"}</span>
    </button>
  );
}
