"use client";

import { useOptimistic, useTransition } from "react";
import { Star } from "lucide-react";
import type { FavoriteKind } from "@prisma/client";
import { toggleFavorite } from "@/lib/actions/student";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  kind,
  lessonId,
  hotkeyId,
  active,
  label,
  className,
}: {
  kind: FavoriteKind;
  lessonId?: string;
  hotkeyId?: string;
  active: boolean;
  label?: string;
  className?: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(active);
  const [, startTransition] = useTransition();
  const title = optimistic ? "Убрать из избранного" : "В избранное";
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={optimistic}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
          setOptimistic(!optimistic);
          await toggleFavorite({ kind, lessonId, hotkeyId });
        });
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md p-1 text-sm transition-colors",
        optimistic ? "text-warning" : "text-fg-3 hover:text-fg",
        label && "px-2",
        className,
      )}
    >
      <Star className="size-4" fill={optimistic ? "currentColor" : "none"} strokeWidth={1.8} />
      {label && <span className={optimistic ? "text-fg" : undefined}>{label}</span>}
    </button>
  );
}
