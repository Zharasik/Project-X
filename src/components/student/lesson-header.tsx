import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { AccessibleLesson } from "@/lib/progress";
import { SoftwareMark } from "@/components/ui/badge";
import { pad2 } from "@/lib/utils";

/** "← Photoshop / Тема 04" — always tells the student where they are. */
export function LessonCrumbs({
  lesson,
  step,
}: {
  lesson: Pick<AccessibleLesson, "id" | "title" | "order" | "module">;
  step?: string;
}) {
  return (
    <nav className="flex min-w-0 items-center gap-1.5 text-sm text-fg-3">
      <Link
        href={step ? `/lessons/${lesson.id}` : `/courses/${lesson.module.course.id}`}
        className="-ml-1 inline-flex items-center rounded-md p-0.5 text-fg-2 transition-colors hover:bg-muted hover:text-fg"
        aria-label="Назад"
      >
        <ChevronLeft className="size-4" />
      </Link>
      <SoftwareMark software={lesson.module.software} />
      <Link href={`/courses/${lesson.module.course.id}`} className="truncate hover:text-fg">
        {lesson.module.title}
      </Link>
      <span>/</span>
      {step ? (
        <>
          <Link href={`/lessons/${lesson.id}`} className="truncate hover:text-fg">
            {lesson.title}
          </Link>
          <span>/</span>
          <span className="truncate text-fg-2">{step}</span>
        </>
      ) : (
        <span className="font-mono text-xs text-fg-2">Тема {pad2(lesson.order + 1)}</span>
      )}
    </nav>
  );
}
