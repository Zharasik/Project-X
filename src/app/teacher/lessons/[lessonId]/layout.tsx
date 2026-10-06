import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTeacherLesson } from "@/lib/teacher-lesson";
import { SoftwareMark } from "@/components/ui/badge";
import { LessonTabs } from "@/components/teacher/lesson-tabs";
import { PublishToggle } from "@/components/teacher/publish-toggle";

export default async function LessonEditorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = await getTeacherLesson(lessonId);
  return (
    <>
      <Link href={`/teacher/courses/${lesson.module.course.id}`} className="inline-flex items-center gap-1 text-sm text-fg-3 hover:text-fg">
        <ChevronLeft className="size-4" />
        {lesson.module.course.title}
        <span className="mx-1">/</span>
        <SoftwareMark software={lesson.module.software} className="size-4 text-[9px]" />
        {lesson.module.title}
      </Link>
      <header className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-display">{lesson.title}</h1>
        <PublishToggle kind="lesson" id={lesson.id} published={lesson.published} />
      </header>
      <LessonTabs
        lessonId={lesson.id}
        filled={{
          lecture: !!lesson.lecture,
          practice: !!lesson.practice,
          quiz: (lesson.quiz?.questions.length ?? 0) > 0,
          hotkeys: lesson.hotkeys.length > 0,
        }}
      />
      <div className="pt-8">{children}</div>
    </>
  );
}
