"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { markLectureRead } from "@/lib/actions/student";
import { Button } from "@/components/ui/button";

export function MarkReadButton({ lessonId }: { lessonId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="primary" size="lg" disabled={pending} onClick={() => start(() => markLectureRead(lessonId))}>
      <Check className="size-4" />
      {pending ? "Сохраняем…" : "Я прочитал(а) лекцию"}
    </Button>
  );
}
