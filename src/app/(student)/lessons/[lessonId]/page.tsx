import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleLesson, getLessonState, getNeighbours, type StepKey } from "@/lib/progress";
import { formatMinutes, pad2, plural } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { SoftwareLabel } from "@/components/ui/badge";
import { Panel } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { Segments } from "@/components/ui/progress";
import { StatusIcon, statusLabel } from "@/components/ui/status";
import { FavoriteButton } from "@/components/student/favorite-button";
import { LessonCrumbs } from "@/components/student/lesson-header";
import { STEP_LABEL } from "@/components/student/steps";
import { FinishLessonForm } from "./finish-form";

type Props = { params: Promise<{ lessonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lessonId } = await params;
  const l = await db.lesson.findUnique({ where: { id: lessonId }, select: { title: true } });
  return { title: l?.title ?? "Тема" };
}

export default async function LessonPage({ params }: Props) {
  const { lessonId } = await params;
  const user = await requireStudent();
  const lesson = await getAccessibleLesson(user.studentProfile.groupId, lessonId);
  if (!lesson) notFound();

  const [state, neighbours, favorite] = await Promise.all([
    getLessonState(user.id, lesson.id),
    getNeighbours(lesson.module.course.id, lesson.id),
    db.favorite.findFirst({ where: { userId: user.id, kind: "LESSON", lessonId: lesson.id } }),
  ]);
  if (!state) notFound();

  const stepTitle: Record<StepKey, string> = {
    lecture: "Лекция",
    practice: lesson.practice?.title ? `Практика: ${lesson.practice.title}` : "Практическое задание",
    quiz: "Тест",
    hotkeys: STEP_LABEL.hotkeys,
  };
  const stepMeta: Record<StepKey, string> = {
    lecture: lesson.lecture ? `~${formatMinutes(lesson.lecture.estimatedMinutes)} чтения` : "",
    practice: lesson.practice ? `~${formatMinutes(lesson.practice.estimatedMinutes)}` : "",
    quiz: lesson.quiz
      ? `${lesson.quiz._count.questions} ${plural(lesson.quiz._count.questions, "вопрос", "вопроса", "вопросов")} · проходной ${lesson.quiz.passingScore}%`
      : "",
    hotkeys: `${lesson.hotkeys.length} ${plural(lesson.hotkeys.length, "сочетание", "сочетания", "сочетаний")}`,
  };
  const remaining = state.steps.filter((s) => s.state !== "done");
  const completed = state.status === "completed";
  const ready = state.allStepsDone;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <LessonCrumbs lesson={lesson} />
        <FavoriteButton kind="LESSON" lessonId={lesson.id} active={!!favorite} label="В избранное" />
      </div>

      <header className="mt-8">
        <h1 className="text-2xl font-semibold tracking-display text-balance">{lesson.title}</h1>
        {lesson.summary && <p className="mt-3 max-w-2xl text-md text-fg-2">{lesson.summary}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg-2">
          <SoftwareLabel software={lesson.module.software} />
          <span>~{formatMinutes(lesson.estimatedMinutes)}</span>
          <span className="inline-flex items-center gap-2">
            <StatusIcon status={state.status} />
            {statusLabel(state.status)}
          </span>
        </div>
      </header>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-xs font-medium tracking-wide text-fg-3 uppercase">Шаги темы</h2>
          <div className="flex items-center gap-3">
            <Segments total={state.total} done={state.done} className="w-24" />
            <span className="font-mono text-xs text-fg-2 tnum">
              {state.done}/{state.total}
            </span>
          </div>
        </div>

        {state.steps.length === 0 ? (
          <Panel className="p-6 text-center text-sm text-fg-2">Материалы темы скоро появятся.</Panel>
        ) : (
          <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {state.steps.map((step, i) => {
              const isNext = state.next?.key === step.key;
              return (
                <li key={step.key}>
                  <Link
                    href={step.href}
                    className={cn(
                      "group relative flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted sm:px-5",
                      isNext && "bg-accent-soft/50 hover:bg-accent-soft",
                    )}
                  >
                    {isNext && <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}
                    <span className={cn("w-6 font-mono text-sm tnum", isNext ? "text-accent" : "text-fg-3")}>
                      {pad2(i + 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{stepTitle[step.key]}</span>
                      <span className="block text-sm text-fg-3">{stepMeta[step.key]}</span>
                    </span>
                    <span className="hidden items-center gap-2 text-sm text-fg-2 sm:flex">
                      <StatusIcon status={step.state} />
                      {statusLabel(step.state)}
                    </span>
                    <span className="sm:hidden">
                      <StatusIcon status={step.state} />
                    </span>
                    {isNext ? (
                      <span className="hidden items-center gap-1 text-sm font-medium text-accent sm:inline-flex">
                        {step.state === "todo" ? "Начать" : "Продолжить"}
                        <ArrowRight className="size-3.5" />
                      </span>
                    ) : (
                      <ChevronRight className="size-4 text-fg-3 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {state.steps.length > 0 && (
        <Panel className="mt-6 px-4 py-4 sm:px-5">
          {completed ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm text-fg">
                <StatusIcon status="completed" />
                Тема завершена
              </p>
              {neighbours.next && (
                <LinkButton href={`/lessons/${neighbours.next.id}`} variant="primary" size="lg">
                  Следующая тема
                  <ArrowRight className="size-4" />
                </LinkButton>
              )}
            </div>
          ) : (
            <FinishLessonForm
              lessonId={lesson.id}
              ready={ready}
              hint={
                ready
                  ? "Все шаги выполнены — можно завершать тему."
                  : `Чтобы завершить тему, выполните: ${remaining.map((s) => STEP_LABEL[s.key].toLowerCase()).join(", ")}.`
              }
            />
          )}
        </Panel>
      )}

      <nav className="mt-10 grid grid-cols-2 gap-3 border-t border-border pt-6 text-sm">
        {neighbours.prev ? (
          <Link href={`/lessons/${neighbours.prev.id}`} className="group min-w-0">
            <span className="flex items-center gap-1 text-fg-3">
              <ArrowLeft className="size-3.5" /> Предыдущая
            </span>
            <span className="mt-0.5 block truncate font-medium group-hover:text-accent">{neighbours.prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {neighbours.next && (
          <Link href={`/lessons/${neighbours.next.id}`} className="group min-w-0 text-right">
            <span className="flex items-center justify-end gap-1 text-fg-3">
              Следующая <ArrowRight className="size-3.5" />
            </span>
            <span className="mt-0.5 block truncate font-medium group-hover:text-accent">{neighbours.next.title}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
