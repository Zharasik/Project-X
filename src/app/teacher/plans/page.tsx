import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateToISO, formatDay, formatWeekday, isoToDate, todayDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Badge, SoftwareMark } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "План занятий" };

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ past?: string }> }) {
  const user = await requireTeacher();
  const { past } = await searchParams;
  const showPast = past === "1";
  const today = todayDate();

  const plans = await db.dailyPlan.findMany({
    where: { group: { teacherId: user.teacherProfile.id }, date: showPast ? { lt: today } : { gte: today } },
    orderBy: [{ date: showPast ? "desc" : "asc" }],
    take: 60,
    include: { group: true, lesson: { include: { module: true } }, items: { orderBy: { order: "asc" } } },
  });

  const byDate = new Map<string, typeof plans>();
  for (const p of plans) {
    const k = dateToISO(p.date);
    byDate.set(k, [...(byDate.get(k) ?? []), p]);
  }

  return (
    <>
      <PageHeader
        title="План занятий"
        description="Студенты видят дату, тему и номер занятия. Тайминг и заметки — только вы."
        actions={
          <LinkButton href="/teacher/plans/new" variant="primary">
            <Plus className="size-3.5" /> Занятие
          </LinkButton>
        }
      />
      <div className="mb-6 flex gap-1">
        {[
          ["Предстоящие", false],
          ["Прошедшие", true],
        ].map(([label, isPast]) => (
          <Link
            key={String(label)}
            href={isPast ? "/teacher/plans?past=1" : "/teacher/plans"}
            className={cn("inline-flex h-8 items-center rounded-md px-3 text-sm", showPast === isPast ? "bg-fg text-bg" : "text-fg-2 hover:bg-muted")}
          >
            {label}
          </Link>
        ))}
      </div>

      {plans.length === 0 ? (
        <EmptyState
          title={showPast ? "Прошедших занятий нет" : "Ничего не запланировано"}
          action={!showPast && <LinkButton href="/teacher/plans/new">Запланировать занятие</LinkButton>}
        />
      ) : (
        <div className="space-y-8">
          {[...byDate.entries()].map(([iso, dayPlans]) => {
            const d = isoToDate(iso);
            const isToday = d.getTime() === today.getTime();
            return (
              <section key={iso} className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
                <div>
                  <p className="text-md font-semibold tracking-display">{formatDay(d)}</p>
                  <p className="text-sm text-fg-3 first-letter:uppercase">
                    {formatWeekday(d)} {isToday && <Badge tone="accent">Сегодня</Badge>}
                  </p>
                </div>
                <ul className="space-y-2">
                  {dayPlans.map((p) => (
                    <li key={p.id} id={p.id}>
                      <Link href={`/teacher/plans/${p.id}`} className="block rounded-lg border border-border bg-surface px-4 py-3.5 transition-colors hover:border-border-strong">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-mono text-sm font-semibold">{p.group.name}</span>
                          {p.number && <span className="font-mono text-xs text-fg-3">№{p.number}</span>}
                          <span className="flex items-center gap-1.5 text-sm">
                            <SoftwareMark software={p.lesson.module.software} />
                            {p.lesson.title}
                          </span>
                          {!p.lesson.published && <Badge tone="warning">тема скрыта</Badge>}
                        </div>
                        {p.items.length > 0 && (
                          <ol className="mt-2.5 grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
                            {p.items.map((it) => (
                              <li key={it.id} className="flex gap-3">
                                <span className="w-24 shrink-0 font-mono text-xs leading-5 text-fg-3 tnum">
                                  {it.start}–{it.end}
                                </span>
                                <span className="text-fg-2">{it.title}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                        {p.teacherNotes && <p className="mt-2 line-clamp-2 border-l-2 border-border-strong pl-3 text-sm text-fg-2">{p.teacherNotes}</p>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
