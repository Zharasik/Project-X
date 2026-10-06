import { getTeacherLesson } from "@/lib/teacher-lesson";
import { parseSteps } from "@/lib/practice";
import { PracticeEditor } from "@/components/teacher/lesson-forms";

export default async function PracticeEditorPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = await getTeacherLesson(lessonId);
  const p = lesson.practice;
  return (
    <div className="max-w-3xl">
      <PracticeEditor lessonId={lesson.id} practice={p ? { ...p, steps: parseSteps(p.steps) } : null} />
    </div>
  );
}
