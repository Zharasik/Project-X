import { getTeacherLesson } from "@/lib/teacher-lesson";
import { LectureEditor } from "@/components/teacher/lesson-forms";

export default async function LectureEditorPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = await getTeacherLesson(lessonId);
  return <LectureEditor lessonId={lesson.id} lecture={lesson.lecture} />;
}
