import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { SUBMISSION_STATUS } from "@/lib/practice";
import { flattenLessons, getCourseOutline, getLessonStates } from "@/lib/progress";
import { pad2 } from "@/lib/utils";
import { Badge, SoftwareMark } from "@/components/ui/badge";
import { Panel, SectionTitle, Stat } from "@/components/ui/misc";
import { ProgressBar } from "@/components/ui/progress";
import { StatusIcon, statusLabel } from "@/components/ui/status";
import { STEP_LABEL } from "@/components/student/steps";

export const metadata: Metadata = { title: "Студент" };

export default async function StudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const user = await requireTeacher();
  const student = await db.user.findFirst({
    where: { id: studentId, studentProfile: { group: { teacherId: user.teacherProfile.id } } },
    include: { studentProfile: { include: { group: { include: { courses: true } } } } },
  });
  if (!student?.studentProfile) notFound();
  const group = student.studentProfile.group;

  const outlines = (await Promise.all(group.courses.map((c) => getCourseOutline(c.courseId)))).filter((o) => o !== null);
  const lessons = outlines.flatMap(flattenLessons);
  const [states, submissions, attempts, progress] = await Promise.all([
    getLessonStates(student.id, lessons.map((l) => l.id)),
    db.submission.findMany({
      where: { studentId: student.id },
      orderBy: { submittedAt: "desc" },
      include: { practice: { select: { title: true, lesson: { select: { title: true } } } } },
    }),
    db.quizAttempt.findMany({
      where: { userId: student.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { quiz: { select: { lesson: { select: { title: true } } } } },
    }),
    db.lessonProgress.findMany({ where: { userId: student.id } }),
  ]);
  const completed = lessons.filter((l) => states.get(l.id)?.status === "completed").length;
  const percent = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
  const quizRows = progress.filter((p) => p.quizBestPercent != null);
  const quizAvg = quizRows.length ? Math.round(quizRows.reduce((s, p) => s + (p.quizBestPercent ?? 0), 0) / quizRows.length) : null;

  return (
    <>
      <Link href={`/teacher/groups/${group.id}`} className="inline-flex items-center gap-1 text-sm text-fg-3 hover:text-fg">
        <ChevronLeft className="size-4" /> {group.name}
      </Link>
      <header className="mt-3 mb-8">
        <h1 className="text-xl font-semibold tracking-display">{student.name}</h1>
        <p className="text-sm text-fg-2">{student.email}</p>
      </header>

      <Panel className="mb-8 grid gap-6 p-5 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Stat label="Прогресс курса" value={`${percent}%`} hint={`${completed} из ${lessons.length} тем завершено`} />
          <ProgressBar value={percent} className="mt-2" />
        </div>
        <Stat label="Средний балл тестов" value={quizAvg != null ? `${quizAvg}%` : "—"} />
        <Stat label="Работ сдано" value={submissions.length} hint={`${submissions.filter((s) => s.status === "SUBMITTED").length} на проверке`} />
      </Panel>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <SectionTitle>Темы</SectionTitle>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {lessons.map((l, i) => {
              const s = states.get(l.id);
              return (
                <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-6 font-mono text-xs text-fg-3">{pad2(i + 1)}</span>
                  <SoftwareMark software={l.module.software} />
                  <span className="min-w-0 flex-1 truncate text-sm">{l.title}</span>
                  <span className="hidden gap-1.5 md:flex">
                    {s?.steps.map((st) => (
                      <span key={st.key} title={`${STEP_LABEL[st.key]}: ${statusLabel(st.state)}`}>
                        <StatusIcon status={st.state} className="size-3.5" />
                      </span>
                    ))}
                  </span>
                  <span className="w-24 text-right text-xs text-fg-2">{statusLabel(s?.status ?? "not_started")}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <aside className="space-y-8">
          <section>
            <SectionTitle>Практические работы</SectionTitle>
            {submissions.length === 0 ? (
              <p className="text-sm text-fg-3">Пока нет сданных работ.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                {submissions.map((s) => (
                  <li key={s.id}>
                    <Link href={`/teacher/submissions?id=${s.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{s.practice.lesson.title}</span>
                        <span className="block text-xs text-fg-3">{formatDateTime(s.submittedAt)}</span>
                      </span>
                      <Badge tone={SUBMISSION_STATUS[s.status].tone}>{SUBMISSION_STATUS[s.status].label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <SectionTitle>Последние тесты</SectionTitle>
            {attempts.length === 0 ? (
              <p className="text-sm text-fg-3">Тесты не проходились.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                {attempts.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{a.quiz?.lesson.title ?? "Быстрый тест"}</span>
                      <span className="block text-xs text-fg-3">{formatDateTime(a.createdAt)}</span>
                    </span>
                    <Badge tone={a.passed ? "success" : "warning"}>{a.percent}%</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
