import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowDown, ArrowUp, ChevronLeft, Trash2 } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteCourse, deleteModule, moveLesson, moveModule } from "@/lib/actions/teacher";
import { formatMinutes, pad2 } from "@/lib/utils";
import { SOFTWARE_LABEL, SoftwareMark } from "@/components/ui/badge";
import { Panel } from "@/components/ui/misc";
import { ActionButton } from "@/components/teacher/action-button";
import { Disclosure } from "@/components/teacher/disclosure";
import { CourseSettingsForm, CreateLessonForm, ModuleForm } from "@/components/teacher/forms";
import { PublishToggle } from "@/components/teacher/publish-toggle";

export const metadata: Metadata = { title: "Курс" };

function ContentDots({ lecture, practice, quiz, hotkeys }: { lecture: boolean; practice: boolean; quiz: number; hotkeys: number }) {
  const items = [
    ["Л", lecture, "Лекция"],
    ["П", practice, "Практика"],
    ["Т", quiz > 0, `Тест: ${quiz} вопр.`],
    ["К", hotkeys > 0, `Клавиши: ${hotkeys}`],
  ] as const;
  return (
    <span className="hidden gap-1 sm:flex">
      {items.map(([l, on, title]) => (
        <span
          key={l}
          title={on ? title : `${title.split(":")[0]} — нет`}
          className={`inline-flex size-5 items-center justify-center rounded-[5px] font-mono text-[10px] ${on ? "bg-fg text-bg" : "border border-dashed border-border-strong text-fg-3"}`}
        >
          {l}
        </span>
      ))}
    </span>
  );
}

export default async function TeacherCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await requireTeacher();
  const course = await db.course.findFirst({
    where: { id: courseId, teacherId: user.teacherProfile.id },
    include: {
      groups: true,
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              lecture: { select: { id: true } },
              practice: { select: { id: true } },
              quiz: { select: { _count: { select: { questions: true } } } },
              _count: { select: { hotkeys: true } },
            },
          },
        },
      },
    },
  });
  if (!course) notFound();
  const groups = await db.group.findMany({ where: { teacherId: user.teacherProfile.id }, select: { id: true, name: true } });

  let n = 0;
  return (
    <>
      <Link href="/teacher/courses" className="inline-flex items-center gap-1 text-sm text-fg-3 hover:text-fg">
        <ChevronLeft className="size-4" /> Курсы
      </Link>
      <header className="mt-3 mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-display">{course.title}</h1>
          <PublishToggle kind="course" id={course.id} published={course.published} />
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
        <div className="space-y-8">
          {course.modules.map((m, mi) => (
            <section key={m.id}>
              <div className="mb-2 flex items-center gap-2">
                <SoftwareMark software={m.software} className="size-6" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{m.title}</h2>
                  <p className="text-xs text-fg-3">
                    Модуль {pad2(mi + 1)} · {SOFTWARE_LABEL[m.software]}
                  </p>
                </div>
                <PublishToggle kind="module" id={m.id} published={m.published} />
                <ActionButton action={moveModule.bind(null, m.id, "up")} title="Выше">
                  <ArrowUp className="size-3.5" />
                </ActionButton>
                <ActionButton action={moveModule.bind(null, m.id, "down")} title="Ниже">
                  <ArrowDown className="size-3.5" />
                </ActionButton>
                <ActionButton action={deleteModule.bind(null, m.id)} confirm={`Удалить модуль «${m.title}» со всеми темами?`} title="Удалить модуль">
                  <Trash2 className="size-3.5" />
                </ActionButton>
              </div>
              <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                {m.lessons.map((l) => {
                  n += 1;
                  return (
                    <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-6 font-mono text-xs text-fg-3 tnum">{pad2(n)}</span>
                      <Link href={`/teacher/lessons/${l.id}`} className="min-w-0 flex-1 group">
                        <span className="block truncate text-sm font-medium group-hover:text-accent">{l.title}</span>
                        <span className="block text-xs text-fg-3">~{formatMinutes(l.estimatedMinutes)}</span>
                      </Link>
                      <ContentDots lecture={!!l.lecture} practice={!!l.practice} quiz={l.quiz?._count.questions ?? 0} hotkeys={l._count.hotkeys} />
                      <PublishToggle kind="lesson" id={l.id} published={l.published} />
                      <span className="flex">
                        <ActionButton action={moveLesson.bind(null, l.id, "up")} title="Выше">
                          <ArrowUp className="size-3.5" />
                        </ActionButton>
                        <ActionButton action={moveLesson.bind(null, l.id, "down")} title="Ниже">
                          <ArrowDown className="size-3.5" />
                        </ActionButton>
                      </span>
                    </li>
                  );
                })}
                <li className="px-2 py-2">
                  <Disclosure label="Тема">
                    <CreateLessonForm moduleId={m.id} />
                  </Disclosure>
                </li>
              </ul>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-fg-3 hover:text-fg">Настройки модуля</summary>
                <Panel className="mt-2 p-4">
                  <ModuleForm courseId={course.id} module={m} />
                </Panel>
              </details>
            </section>
          ))}
          <Disclosure label="Модуль" variant="secondary">
            <ModuleForm courseId={course.id} />
          </Disclosure>
        </div>

        <aside className="space-y-4">
          <Panel className="p-5">
            <h2 className="mb-4 text-sm font-semibold">Настройки курса</h2>
            <CourseSettingsForm
              course={{ ...course, groupIds: course.groups.map((g) => g.groupId) }}
              groups={groups}
            />
          </Panel>
          <div className="flex justify-end">
            <ActionButton action={deleteCourse.bind(null, course.id)} confirm="Удалить курс целиком? Это действие нельзя отменить." variant="danger">
              <Trash2 className="size-3.5" /> Удалить курс
            </ActionButton>
          </div>
        </aside>
      </div>
    </>
  );
}
