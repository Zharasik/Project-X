import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleLesson, getLessonState, touchLesson } from "@/lib/progress";
import { formatMinutes } from "@/lib/utils";
import { LinkButton } from "@/components/ui/button";
import { StatusIcon } from "@/components/ui/status";
import { Markdown, extractToc } from "@/components/markdown";
import { FavoriteButton } from "@/components/student/favorite-button";
import { LessonCrumbs } from "@/components/student/lesson-header";
import { ReadingProgress } from "@/components/student/reading-progress";
import { STEP_LABEL } from "@/components/student/steps";
import { MarkReadButton } from "./mark-read";

type Props = { params: Promise<{ lessonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lessonId } = await params;
  const l = await db.lesson.findUnique({ where: { id: lessonId }, select: { title: true } });
  return { title: l ? `Лекция · ${l.title}` : "Лекция" };
}

export default async function LecturePage({ params }: Props) {
  const { lessonId } = await params;
  const user = await requireStudent();
  const lesson = await getAccessibleLesson(user.studentProfile.groupId, lessonId);
  if (!lesson?.lecture) notFound();

  await touchLesson(user.id, lesson.id);
  const [state, favorite] = await Promise.all([
    getLessonState(user.id, lesson.id),
    db.favorite.findFirst({ where: { userId: user.id, kind: "LECTURE", lessonId: lesson.id } }),
  ]);
  const read = state?.steps.find((s) => s.key === "lecture")?.state === "done";
  const next = state?.steps.find((s) => s.key !== "lecture" && s.state !== "done");
  const toc = extractToc(lesson.lecture.body);

  return (
    <>
      <ReadingProgress />
      <div className="mx-auto grid max-w-5xl gap-12 xl:grid-cols-[minmax(0,680px)_200px] xl:justify-between">
        <article className="min-w-0">
          <div className="flex items-center justify-between gap-4">
            <LessonCrumbs lesson={lesson} step="Лекция" />
            <FavoriteButton kind="LECTURE" lessonId={lesson.id} active={!!favorite} />
          </div>
          <header className="mt-8 border-b border-border pb-8">
            <p className="font-mono text-xs text-fg-3">01 — Лекция · {formatMinutes(lesson.lecture.estimatedMinutes)} чтения</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-display text-balance">{lesson.title}</h1>
            {lesson.summary && <p className="mt-3 text-lg leading-relaxed text-fg-2">{lesson.summary}</p>}
          </header>

          <Markdown className="mt-8">{lesson.lecture.body}</Markdown>

          <footer className="mt-14 rounded-lg border border-border bg-surface p-5">
            {read ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-sm">
                  <StatusIcon status="done" />
                  Лекция прочитана
                </p>
                {next ? (
                  <LinkButton href={next.href} variant="primary" size="lg">
                    Дальше: {STEP_LABEL[next.key]}
                    <ArrowRight className="size-4" />
                  </LinkButton>
                ) : (
                  <LinkButton href={`/lessons/${lesson.id}`} variant="primary" size="lg">
                    К теме
                    <ArrowRight className="size-4" />
                  </LinkButton>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-fg-2">Дочитали до конца? Отметьте лекцию — это засчитает шаг.</p>
                <MarkReadButton lessonId={lesson.id} />
              </div>
            )}
          </footer>
        </article>

        {toc.length > 2 && (
          <aside className="hidden xl:block">
            <nav className="sticky top-24">
              <p className="mb-3 text-xs font-medium tracking-wide text-fg-3 uppercase">Содержание</p>
              <ul className="space-y-2 border-l border-border text-sm">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="-ml-px block border-l border-transparent pl-3 text-fg-2 transition-colors hover:border-fg hover:text-fg">
                      {t.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
      </div>
    </>
  );
}
