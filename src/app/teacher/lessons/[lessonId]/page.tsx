import Link from "next/link";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteLesson } from "@/lib/actions/teacher";
import { getTeacherLesson } from "@/lib/teacher-lesson";
import { formatDayShort } from "@/lib/dates";
import { Panel, SectionTitle } from "@/components/ui/misc";
import { ActionButton } from "@/components/teacher/action-button";
import { LessonSettingsForm } from "@/components/teacher/lesson-forms";

export default async function LessonOverviewPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = await getTeacherLesson(lessonId);
  const [modules, plans] = await Promise.all([
    db.module.findMany({ where: { courseId: lesson.module.courseId }, orderBy: { order: "asc" }, select: { id: true, title: true } }),
    db.dailyPlan.findMany({ where: { lessonId }, orderBy: { date: "asc" }, include: { group: { select: { name: true } } } }),
  ]);
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Panel className="p-5">
        <LessonSettingsForm lesson={lesson} modules={modules} />
      </Panel>
      <aside className="space-y-6">
        <section>
          <SectionTitle>В плане занятий</SectionTitle>
          {plans.length === 0 ? (
            <p className="text-sm text-fg-3">Тема ещё не запланирована.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {plans.map((p) => (
                <li key={p.id}>
                  <Link href={`/teacher/plans/${p.id}`} className="flex gap-3 hover:text-accent">
                    <span className="w-16 font-mono text-xs leading-5 text-fg-3">{formatDayShort(p.date)}</span>
                    {p.group.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/teacher/plans/new?lesson=${lesson.id}`} className="mt-3 inline-block text-sm text-fg-2 hover:text-fg">
            Запланировать →
          </Link>
        </section>
        <ActionButton action={deleteLesson.bind(null, lesson.id)} confirm={`Удалить тему «${lesson.title}» вместе с лекцией, заданием и тестом?`} variant="danger">
          <Trash2 className="size-3.5" /> Удалить тему
        </ActionButton>
      </aside>
    </div>
  );
}
