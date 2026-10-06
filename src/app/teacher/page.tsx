import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Plus } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime, formatDay, formatDayShort, formatWeekday, relativeDay, todayDate } from "@/lib/dates";
import { getLessonGroupStats, getTeacherGroups } from "@/lib/teacher";
import { plural } from "@/lib/utils";
import { Badge, SoftwareMark } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, Panel, SectionTitle } from "@/components/ui/misc";
import { StepMeter } from "@/components/teacher/step-meter";

export const metadata: Metadata = { title: "Обзор" };

export default async function TeacherDashboard() {
  const user = await requireTeacher();
  const teacherId = user.teacherProfile.id;
  const today = todayDate();

  const groups = await getTeacherGroups(teacherId);
  const groupCards = await Promise.all(
    groups.map(async (g) => {
      const plan =
        (await db.dailyPlan.findFirst({
          where: { groupId: g.id, date: today },
          include: { lesson: { include: { module: true } }, items: { orderBy: { order: "asc" } } },
        })) ??
        (await db.dailyPlan.findFirst({
          where: { groupId: g.id, date: { lt: today } },
          orderBy: { date: "desc" },
          include: { lesson: { include: { module: true } }, items: { orderBy: { order: "asc" } } },
        }));
      const studentIds = g.students.map((s) => s.userId);
      const stats = plan ? await getLessonGroupStats(plan.lessonId, studentIds) : null;
      return { group: g, plan, stats, isToday: plan?.date.getTime() === today.getTime() };
    }),
  );

  const pendingWhere = { status: "SUBMITTED" as const, student: { studentProfile: { group: { teacherId } } } };
  const [pendingCount, pending, recentAttempts, upcoming] = await Promise.all([
    db.submission.count({ where: pendingWhere }),
    db.submission.findMany({
      where: pendingWhere,
      orderBy: { submittedAt: "asc" },
      take: 6,
      include: { student: { select: { name: true } }, practice: { select: { title: true, lesson: { select: { title: true } } } } },
    }),
    db.quizAttempt.findMany({
      where: { mode: "LESSON", user: { studentProfile: { group: { teacherId } } } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { name: true } }, quiz: { select: { lesson: { select: { title: true } } } } },
    }),
    db.dailyPlan.findMany({
      where: { group: { teacherId }, date: { gt: today } },
      orderBy: { date: "asc" },
      take: 4,
      include: { group: true, lesson: { include: { module: true } } },
    }),
  ]);

  const totalStudents = groups.reduce((n, g) => n + g.students.length, 0);

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-fg-3 first-letter:uppercase">
            {formatWeekday(today)}, {formatDay(today)}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-display">Обзор</h1>
          <p className="mt-1 text-sm text-fg-2 tnum">
            {groups.length} {plural(groups.length, "группа", "группы", "групп")} · {totalStudents}{" "}
            {plural(totalStudents, "студент", "студента", "студентов")} · {pendingCount > 0 ? `${pendingCount} ${plural(pendingCount, "работа", "работы", "работ")} на проверке` : "нет работ на проверке"}
          </p>
        </div>
        <LinkButton href="/teacher/plans/new" variant="primary">
          <Plus className="size-3.5" />
          Запланировать занятие
        </LinkButton>
      </header>

      <section>
        <SectionTitle>Группы</SectionTitle>
        {groupCards.length === 0 ? (
          <EmptyState title="Групп пока нет" action={<LinkButton href="/teacher/groups">Создать группу</LinkButton>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
            {groupCards.map(({ group, plan, stats, isToday }) => (
              <Panel key={group.id} className="flex flex-col">
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                  <Link href={`/teacher/groups/${group.id}`} className="font-mono text-md font-semibold hover:text-accent">
                    {group.name}
                  </Link>
                  <span className="text-sm text-fg-2 tnum">
                    {group.students.length} {plural(group.students.length, "студент", "студента", "студентов")}
                  </span>
                </div>
                {plan && stats ? (
                  <div className="flex flex-1 flex-col px-5 py-4">
                    <div className="flex items-center gap-2 text-xs text-fg-3">
                      {isToday ? <Badge tone="accent">Сегодня</Badge> : <span>Последнее занятие · {formatDayShort(plan.date)}</span>}
                      {plan.number && <span className="font-mono">№{plan.number}</span>}
                    </div>
                    <p className="mt-2 flex items-center gap-2 font-medium">
                      <SoftwareMark software={plan.lesson.module.software} />
                      {plan.lesson.title}
                    </p>
                    <div className="mt-4 grid gap-3">
                      <StepMeter label="Лекция" value={stats.lecture} total={stats.students} muted={!stats.hasLecture} />
                      <StepMeter label="Практика" value={stats.practice} total={stats.students} muted={!stats.hasPractice} />
                      <StepMeter label="Тест" value={stats.quiz} total={stats.students} muted={!stats.hasQuiz} />
                    </div>
                    {isToday && plan.items.length > 0 && (
                      <ol className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
                        {plan.items.map((it) => (
                          <li key={it.id} className="flex gap-3">
                            <span className="w-24 shrink-0 font-mono text-xs leading-5 text-fg-3 tnum">
                              {it.start}–{it.end}
                            </span>
                            <span>{it.title}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    <Link href={`/teacher/groups/${group.id}?lesson=${plan.lessonId}`} className="mt-4 inline-flex items-center gap-1 self-start text-sm text-fg-2 hover:text-fg">
                      Кто не выполнил <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="px-5 py-6 text-sm text-fg-2">Занятий ещё не было.</div>
                )}
              </Panel>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-2 [&>*]:min-w-0">
        <section>
          <SectionTitle
            action={
              <Link href="/teacher/submissions" className="text-sm text-fg-2 hover:text-fg">
                Все →
              </Link>
            }
          >
            Ждут проверки
          </SectionTitle>
          {pending.length === 0 ? (
            <EmptyState title="Все работы проверены" />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {pending.map((s) => (
                <li key={s.id}>
                  <Link href={`/teacher/submissions?id=${s.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.student.name}</span>
                      <span className="block truncate text-xs text-fg-3">{s.practice.lesson.title} · {s.practice.title}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-fg-3">{formatDateTime(s.submittedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle
            action={
              <Link href="/teacher/results" className="text-sm text-fg-2 hover:text-fg">
                Все →
              </Link>
            }
          >
            Последние тесты
          </SectionTitle>
          {recentAttempts.length === 0 ? (
            <EmptyState title="Тесты ещё не проходили" />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {recentAttempts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.user.name}</span>
                    <span className="block truncate text-xs text-fg-3">{a.quiz?.lesson.title}</span>
                  </span>
                  <span className="font-mono text-xs text-fg-3 tnum">
                    {a.correct}/{a.total}
                  </span>
                  <Badge tone={a.passed ? "success" : "warning"}>{a.percent}%</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {upcoming.length > 0 && (
        <section>
          <SectionTitle
            action={
              <Link href="/teacher/plans" className="text-sm text-fg-2 hover:text-fg">
                План →
              </Link>
            }
          >
            Ближайшие занятия
          </SectionTitle>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {upcoming.map((p) => (
              <li key={p.id}>
                <Link href={`/teacher/plans/${p.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted">
                  <span className="w-20 shrink-0 text-sm text-fg-2">{relativeDay(p.date)}</span>
                  <span className="w-16 shrink-0 font-mono text-xs text-fg-3">{p.group.name}</span>
                  <SoftwareMark software={p.lesson.module.software} />
                  <span className="truncate text-sm font-medium">{p.lesson.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
