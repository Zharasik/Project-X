import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma, Software } from "@prisma/client";
import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleLesson } from "@/lib/progress";
import { startLessonHotkeys } from "@/lib/actions/student";
import { cn } from "@/lib/utils";
import { SOFTWARE_LABEL, SoftwareMark } from "@/components/ui/badge";
import { EmptyState, KeyCombo, PageHeader } from "@/components/ui/misc";
import { StatusIcon } from "@/components/ui/status";
import { FavoriteButton } from "@/components/student/favorite-button";
import { HotkeyTrainer } from "@/components/student/hotkey-trainer";
import { LessonCrumbs } from "@/components/student/lesson-header";

export const metadata: Metadata = { title: "Горячие клавиши" };

const SETS: { key: string; label: string; software?: Software }[] = [
  { key: "all", label: "Все" },
  { key: "PHOTOSHOP", label: "Photoshop", software: "PHOTOSHOP" },
  { key: "ILLUSTRATOR", label: "Illustrator", software: "ILLUSTRATOR" },
  { key: "GENERAL", label: "Общие", software: "GENERAL" },
];

export default async function HotkeysPage({ searchParams }: { searchParams: Promise<{ set?: string; lesson?: string }> }) {
  const sp = await searchParams;
  const user = await requireStudent();

  const lesson = sp.lesson ? await getAccessibleLesson(user.studentProfile.groupId, sp.lesson) : null;
  if (lesson) await startLessonHotkeys(lesson.id);

  const activeSet = lesson ? "lesson" : SETS.some((s) => s.key === sp.set) ? sp.set! : "all";
  const software = SETS.find((s) => s.key === activeSet)?.software;
  const where: Prisma.HotkeyWhereInput = lesson
    ? { published: true, lessons: { some: { lessonId: lesson.id } } }
    : { published: true, ...(software ? { software } : {}) };

  const [hotkeys, stats, favorites] = await Promise.all([
    db.hotkey.findMany({ where, orderBy: [{ software: "asc" }, { keys: "asc" }] }),
    db.hotkeyStat.findMany({ where: { userId: user.id } }),
    db.favorite.findMany({ where: { userId: user.id, kind: "HOTKEY" }, select: { hotkeyId: true } }),
  ]);
  const statById = new Map(stats.map((s) => [s.hotkeyId, s]));
  const favSet = new Set(favorites.map((f) => f.hotkeyId));
  const learned = hotkeys.filter((h) => (statById.get(h.id)?.correct ?? 0) > 0).length;

  const trainerItems = hotkeys.map((h) => ({ id: h.id, action: h.action, keys: h.keys, macKeys: h.macKeys, software: h.software }));
  const title = lesson ? `Тема: ${lesson.title}` : activeSet === "all" ? "Все сочетания" : SOFTWARE_LABEL[software!];

  return (
    <div className="mx-auto max-w-3xl">
      {lesson ? (
        <>
          <LessonCrumbs lesson={lesson} step="Горячие клавиши" />
          <header className="mt-8 mb-8">
            <h1 className="text-2xl font-semibold tracking-display">Горячие клавиши темы</h1>
            <p className="mt-2 text-fg-2">Ответьте верно на каждое сочетание хотя бы раз — шаг темы будет засчитан.</p>
          </header>
        </>
      ) : (
        <PageHeader title="Горячие клавиши" description="Тренажёр: читайте действие и нажимайте сочетание на клавиатуре." />
      )}

      {!lesson && (
        <div className="mb-6 flex gap-1 overflow-x-auto">
          {SETS.map((s) => (
            <Link
              key={s.key}
              href={s.key === "all" ? "/hotkeys" : `/hotkeys?set=${s.key}`}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm transition-colors",
                activeSet === s.key ? "bg-fg text-bg" : "text-fg-2 hover:bg-muted hover:text-fg",
              )}
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}

      {hotkeys.length === 0 ? (
        <EmptyState title="Сочетаний пока нет" description="Преподаватель ещё не добавил горячие клавиши в этот раздел." />
      ) : (
        <>
          <HotkeyTrainer key={activeSet + (lesson?.id ?? "")} hotkeys={trainerItems} title={title} />

          <section className="mt-12">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-medium tracking-wide text-fg-3 uppercase">Шпаргалка</h2>
              <span className="font-mono text-xs text-fg-3 tnum">
                выучено {learned}/{hotkeys.length}
              </span>
            </div>
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {hotkeys.map((h) => {
                const s = statById.get(h.id);
                return (
                  <li key={h.id} className="flex items-center gap-3 px-4 py-2.5">
                    <StatusIcon status={s?.correct ? "done" : s?.attempts ? "in_progress" : "todo"} />
                    <SoftwareMark software={h.software} />
                    <span className="min-w-0 flex-1 truncate text-sm">{h.action}</span>
                    <KeyCombo combo={h.keys} />
                    <FavoriteButton kind="HOTKEY" hotkeyId={h.id} active={favSet.has(h.id)} />
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
