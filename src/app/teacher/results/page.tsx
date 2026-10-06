import Link from "next/link";
import type { Metadata } from "next";
import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Select } from "@/components/ui/form";

export const metadata: Metadata = { title: "Результаты тестов" };

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ group?: string; lesson?: string }> }) {
  const user = await requireTeacher();
  const sp = await searchParams;
  const teacherId = user.teacherProfile.id;

  const [groups, quizzes] = await Promise.all([
    db.group.findMany({ where: { teacherId }, orderBy: { name: "asc" }, include: { students: { include: { user: { select: { id: true, name: true } } } } } }),
    db.quiz.findMany({
      where: { lesson: { module: { course: { teacherId } } } },
      include: { lesson: { select: { id: true, title: true, order: true, module: { select: { order: true, title: true } } } }, _count: { select: { questions: true } } },
    }),
  ]);
  quizzes.sort((a, b) => a.lesson.module.order - b.lesson.module.order || a.lesson.order - b.lesson.order);

  const group = groups.find((g) => g.id === sp.group) ?? groups[0];
  const quiz = quizzes.find((q) => q.lesson.id === sp.lesson) ?? null;
  const students = (group?.students ?? []).map((s) => s.user).sort((a, b) => a.name.localeCompare(b.name, "ru"));

  if (!group) return <EmptyState title="Нет групп" />;

  // Matrix: best % per student × quiz, or attempts list for one quiz.
  const progress = await db.lessonProgress.findMany({
    where: { userId: { in: students.map((s) => s.id) }, lessonId: { in: quizzes.map((q) => q.lessonId) } },
    select: { userId: true, lessonId: true, quizBestPercent: true },
  });
  const best = new Map(progress.map((p) => [`${p.userId}:${p.lessonId}`, p.quizBestPercent]));
  const attempts = quiz
    ? await db.quizAttempt.findMany({
        where: { quizId: quiz.id, userId: { in: students.map((s) => s.id) } },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      })
    : [];

  return (
    <>
      <PageHeader title="Результаты тестов" description="Лучший результат каждого студента. Оранжевым — ниже проходного балла." />
      <form className="mb-6 flex flex-wrap gap-2" action="">
        <Select name="group" defaultValue={group.id} className="w-40">
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <Select name="lesson" defaultValue={quiz?.lesson.id ?? ""} className="w-auto min-w-64">
          <option value="">Все тесты (сводная таблица)</option>
          {quizzes.map((q) => (
            <option key={q.id} value={q.lesson.id}>
              {q.lesson.module.title} · {q.lesson.title}
            </option>
          ))}
        </Select>
        <button className="h-9 rounded-md border border-border bg-surface px-3 text-sm hover:bg-muted">Показать</button>
      </form>

      {quiz ? (
        attempts.length === 0 ? (
          <EmptyState title="Попыток ещё нет" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-3">
                  <th className="px-4 py-2.5 font-medium">Студент</th>
                  <th className="px-4 py-2.5 font-medium">Дата</th>
                  <th className="px-4 py-2.5 text-right font-medium">Верно</th>
                  <th className="px-4 py-2.5 text-right font-medium">Результат</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/teacher/students/${a.userId}`} className="hover:text-accent">
                        {a.user.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-fg-2">{formatDateTime(a.createdAt)}</td>
                    <td className="px-4 py-2.5 text-right font-mono tnum">
                      {a.correct}/{a.total}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge tone={a.passed ? "success" : "warning"}>{a.percent}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-fg-3">
                <th className="sticky left-0 bg-surface px-4 py-2.5 text-left font-medium">Студент</th>
                {quizzes.map((q, i) => (
                  <th key={q.id} className="px-2 py-2.5 text-center font-mono font-medium" title={q.lesson.title}>
                    <Link href={`/teacher/results?group=${group.id}&lesson=${q.lesson.id}`} className="hover:text-fg">
                      {String(i + 1).padStart(2, "0")}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="sticky left-0 bg-surface px-4 py-2 whitespace-nowrap">
                    <Link href={`/teacher/students/${s.id}`} className="hover:text-accent">
                      {s.name}
                    </Link>
                  </td>
                  {quizzes.map((q) => {
                    const v = best.get(`${s.id}:${q.lessonId}`);
                    return (
                      <td key={q.id} className="px-2 py-2 text-center">
                        <span
                          className={cn(
                            "inline-flex h-6 w-10 items-center justify-center rounded-sm font-mono text-xs tnum",
                            v == null ? "text-fg-3" : v >= q.passingScore ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
                          )}
                        >
                          {v ?? "·"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
