import { db } from "@/lib/db";
import { getTeacherLesson } from "@/lib/teacher-lesson";
import { LessonHotkeysForm } from "@/components/teacher/lesson-forms";

export default async function LessonHotkeysPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = await getTeacherLesson(lessonId);
  const hotkeys = await db.hotkey.findMany({ orderBy: [{ software: "asc" }, { action: "asc" }], select: { id: true, action: true, keys: true, software: true } });
  return (
    <div className="max-w-3xl">
      <p className="mb-4 text-sm text-fg-2">Выберите сочетания, которые студент должен освоить в этой теме. Шаг засчитывается, когда на каждое дан верный ответ в тренажёре.</p>
      <LessonHotkeysForm
        lessonId={lesson.id}
        hotkeys={hotkeys}
        selected={lesson.hotkeys.map((h) => h.hotkeyId)}
        defaultSoftware={lesson.module.software}
      />
    </div>
  );
}
