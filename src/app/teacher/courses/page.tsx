import Link from "next/link";
import type { Metadata } from "next";
import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { plural } from "@/lib/utils";
import { EmptyState, PageHeader, Panel } from "@/components/ui/misc";
import { PublishToggle } from "@/components/teacher/publish-toggle";
import { CreateCourseForm } from "@/components/teacher/forms";

export const metadata: Metadata = { title: "Курсы" };

export default async function TeacherCoursesPage() {
  const user = await requireTeacher();
  const courses = await db.course.findMany({
    where: { teacherId: user.teacherProfile.id },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { modules: true } },
      modules: { select: { _count: { select: { lessons: true } } } },
      groups: { include: { group: { select: { name: true } } } },
    },
  });

  return (
    <>
      <PageHeader title="Курсы" description="Структура: курс → модули → темы. Внутри темы — лекция, практика, тест и горячие клавиши." />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {courses.length === 0 ? (
            <EmptyState title="Курсов пока нет" description="Создайте первый курс справа." />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {courses.map((c) => {
                const lessons = c.modules.reduce((n, m) => n + m._count.lessons, 0);
                return (
                  <li key={c.id} className="flex items-center gap-4 px-5 py-4">
                    <Link href={`/teacher/courses/${c.id}`} className="min-w-0 flex-1 group">
                      <span className="block font-medium group-hover:text-accent">{c.title}</span>
                      <span className="block text-sm text-fg-3 tnum">
                        {c._count.modules} {plural(c._count.modules, "модуль", "модуля", "модулей")} · {lessons}{" "}
                        {plural(lessons, "тема", "темы", "тем")}
                        {c.groups.length > 0 && <> · {c.groups.map((g) => g.group.name).join(", ")}</>}
                      </span>
                    </Link>
                    <PublishToggle kind="course" id={c.id} published={c.published} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <Panel className="h-fit p-5">
          <h2 className="mb-4 text-sm font-semibold">Новый курс</h2>
          <CreateCourseForm />
        </Panel>
      </div>
    </>
  );
}
