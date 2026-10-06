"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { finishLesson } from "@/lib/actions/student";
import { Button } from "@/components/ui/button";

export function FinishLessonForm({ lessonId, ready, hint }: { lessonId: string; ready: boolean; hint: string }) {
  const [state, action, pending] = useActionState(finishLesson, undefined);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input type="hidden" name="lessonId" value={lessonId} />
      <p className="text-sm text-fg-2">{state?.error ?? hint}</p>
      <Button
        variant={ready ? "primary" : "secondary"}
        size="lg"
        disabled={!ready || pending}
        title={ready ? undefined : "Сначала выполните все шаги темы"}
      >
        <Check className="size-4" />
        Завершить тему
      </Button>
    </form>
  );
}
