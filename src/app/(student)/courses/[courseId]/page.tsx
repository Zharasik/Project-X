import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCourseOutline, getCourseProgress } from "@/lib/progress";
import { formatMinutes, pad2, plural } from "@/lib/utils";
import { SOFTWARE_LABEL, SoftwareMark } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { StatusIcon, statusLabel } from "@/components/ui/status";
import { FavoriteButton } from "@/components/student/favorite-button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Курс" };

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await requireStudent();
  const outline = await getCourseOutline(courseId);
  const assigned = outline
    ? await db.groupCourse.findUnique({ where: { groupId_courseId: { groupId: user.studentProfile.groupId, courseId } } })
    : null;
  if (!outline || !assigned) notFound();

  const progress = await getCourseProgress(user.id, outline);
  const favorites = new Set(
    (await db.favorite.findMany({ where: { userId: user.id, kind: "LESSON" }, select: { lessonId: true } })).map((f) => f.lessonId),
  );

  let counter = 0;
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-10">
        <p className="text-sm text-fg-3">Курс</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-display">{outline.title}</h1>
        {outline.description && <p className="mt-2 max-w-2xl text-md text-fg-2">{outline.description}</p>}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="text-fg-2 tnum">
                {progress.completed} / {progress.total} {plural(progress.total, "темы", "тем", "тем")} завершено
              </span>
              <span className="font-mono font-medium tnum">{progress.percent}%</span>
            </div>
            <ProgressBar value={progress.percent} />
          </div>
          {progress.current && (
            <LinkButton href={`/lessons/${progress.current.id}`} variant="primary" className="sm:ml-6">
              Продолжить: {progress.current.title}
              <ArrowRight className="size-3.5" />
            </LinkButton>
          )}
        </div>
      </header>

      <div className="space-y-10">
        {outline.modules.map((m, mi) => {
          const done = m.lessons.filter((l) => progress.states.get(l.id)?.status === "completed").length;
          return (
            <section key={m.id}>
              <div className="mb-3 flex items-end justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <SoftwareMark software={m.software} className="size-6 text-[11px]" />
                  <div>
                    <h2 className="text-md font-semibold tracking-display">{m.title}</h2>
                    <p className="text-xs text-fg-3">
                      Модуль {pad2(mi + 1)} · {SOFTWARE_LABEL[m.software]}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs text-fg-3 tnum">
                  {done}/{m.lessons.length}
                </span>
              </div>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                {m.lessons.map((l) => {
                  counter += 1;
                  const s = progress.states.get(l.id);
                  const isCurrent = progress.current?.id === l.id;
                  return (
                    <li key={l.id} className="relative">
                      <Link
                        href={`/lessons/${l.id}`}
                        className={cn(
                          "group grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3.5 transition-colors hover:bg-muted sm:grid-cols-[28px_minmax(0,1fr)_120px_96px_32px]",
                          isCurrent && "bg-accent-soft/40",
                        )}
                      >
                        <span className={cn("font-mono text-xs tnum", isCurrent ? "text-accent" : "text-fg-3")}>
                          {pad2(counter)}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium">{l.title}</span>
                            {isCurrent && (
                              <span className="hidden shrink-0 rounded-sm bg-accent px-1.5 text-[11px] leading-5 font-medium text-accent-fg sm:inline">
                                Текущая
                              </span>
                            )}
                          </span>
                          {l.summary && <span className="mt-0.5 block truncate text-sm text-fg-2">{l.summary}</span>}
                        </span>
                        <span className="hidden text-sm text-fg-3 tnum sm:block">~{formatMinutes(l.estimatedMinutes)}</span>
                        <span className="flex items-center gap-2 text-sm text-fg-2 sm:justify-start">
                          <StatusIcon status={s?.status ?? "not_started"} />
                          <span className="hidden sm:inline">{statusLabel(s?.status ?? "not_started")}</span>
                        </span>
                        <span className="hidden sm:block" />
                      </Link>
                      <FavoriteButton
                        kind="LESSON"
                        lessonId={l.id}
                        active={favorites.has(l.id)}
                        className="absolute top-1/2 right-3 hidden -translate-y-1/2 sm:inline-flex"
                      />
                    </li>
                  );
                })}
                {m.lessons.length === 0 && <li className="px-4 py-6 text-center text-sm text-fg-3">Темы скоро появятся</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
