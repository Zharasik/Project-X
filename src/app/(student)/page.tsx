import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Keyboard, Zap } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDay, formatDayShort, formatWeekday, relativeDay, todayDate } from "@/lib/dates";
import {
  getCourseOutline,
  getCourseProgress,
  getLessonStates,
  getStudentCourses,
  type CourseProgress,
  type LessonState,
} from "@/lib/progress";
import { getGroupSchedule, getMissed, type StudentPlan } from "@/lib/schedule";
import { formatMinutes, plural } from "@/lib/utils";
import { LinkButton } from "@/components/ui/button";
import { SoftwareLabel, SoftwareMark } from "@/components/ui/badge";
import { EmptyState, Panel, SectionTitle } from "@/components/ui/misc";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { StatusIcon } from "@/components/ui/status";
import { StepStrip } from "@/components/student/steps";

export const metadata: Metadata = { title: "Главная" };

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: process.env.APP_TIMEZONE ?? "Asia/Almaty" }).format(new Date()));
  if (h < 5) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

export default async function DashboardPage() {
  const user = await requireStudent();
  const groupId = user.studentProfile.groupId;

  const [courses, schedule] = await Promise.all([getStudentCourses(groupId), getGroupSchedule(groupId)]);
  const outlines = (await Promise.all(courses.map((c) => getCourseOutline(c.id)))).filter((o) => o !== null);
  const progresses = await Promise.all(outlines.map((o) => getCourseProgress(user.id, o)));

  const plannedLessonIds = [...schedule.past, ...schedule.today, ...schedule.upcoming].map((p) => p.lesson.id);
  const planStates = await getLessonStates(user.id, plannedLessonIds);
  const missed = getMissed(schedule.past, planStates);
  const todayPlan = schedule.today[0] ?? null;
  const main = progresses[0] ?? null;
  const mainCourse = outlines[0] ?? null;

  const quizStats = await db.lessonProgress.aggregate({
    where: { userId: user.id, quizBestPercent: { not: null } },
    _avg: { quizBestPercent: true },
    _count: { quizBestPercent: true },
  });
  const openTasks = [...planStates.values()].filter((s) => {
    const p = s.steps.find((x) => x.key === "practice");
    return p && p.state !== "done";
  }).length;

  const firstName = user.name.split(" ")[0];
  const today = todayDate();

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm text-fg-3 first-letter:uppercase">
          {formatWeekday(today)}, {formatDay(today)}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-display">
          {greeting()}, {firstName}
        </h1>
      </header>

      {missed.length > 0 && (
        <MissedBanner missed={missed} />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
        {todayPlan ? (
          <TodayCard plan={todayPlan} state={planStates.get(todayPlan.lesson.id)!} emphasize={missed.length === 0} />
        ) : (
          <NoClassToday progress={main} upcoming={schedule.upcoming[0]} />
        )}

        <Panel className="p-5">
          <SectionTitle>Прогресс</SectionTitle>
          {main && mainCourse ? (
            <>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <ProgressRing value={main.percent} size={64} stroke={5} />
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-medium tnum">
                    {main.percent}%
                  </span>
                </div>
                <div>
                  <p className="font-medium">{mainCourse.title}</p>
                  <p className="text-sm text-fg-2 tnum">
                    {main.completed} / {main.total} {plural(main.total, "темы", "тем", "тем")} завершено
                  </p>
                </div>
              </div>
              <dl className="mt-5 divide-y divide-border border-t border-border text-sm">
                <Row label="Текущая тема">
                  {main.current ? (
                    <Link href={`/lessons/${main.current.id}`} className="truncate font-medium text-fg hover:text-accent">
                      {main.current.title}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Row>
                <Row label="Незавершённые задания">
                  <span className="font-mono tnum">{openTasks}</span>
                </Row>
                <Row label="Средний балл тестов">
                  <span className="font-mono tnum">
                    {quizStats._count.quizBestPercent ? `${Math.round(quizStats._avg.quizBestPercent ?? 0)}%` : "—"}
                  </span>
                </Row>
              </dl>
              {progresses.length > 1 && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  {outlines.slice(1).map((o, i) => (
                    <Link key={o.id} href={`/courses/${o.id}`} className="block">
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{o.title}</span>
                        <span className="font-mono text-fg-2 tnum">{progresses[i + 1].percent}%</span>
                      </div>
                      <ProgressBar value={progresses[i + 1].percent} />
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-fg-2">Курс пока не назначен вашей группе.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
        <section>
          <SectionTitle
            action={
              mainCourse && (
                <Link href={`/courses/${mainCourse.id}`} className="text-sm text-fg-2 hover:text-fg">
                  Все темы →
                </Link>
              )
            }
          >
            Предыдущие занятия
          </SectionTitle>
          {schedule.past.length ? (
            <ScheduleList plans={[...schedule.past].reverse().slice(0, 6)} states={planStates} />
          ) : (
            <EmptyState title="Пока занятий не было" description="Здесь появится история занятий вашей группы." />
          )}
        </section>

        <aside className="space-y-8">
          {schedule.upcoming.length > 0 && (
            <section>
              <SectionTitle>Далее</SectionTitle>
              <ScheduleList plans={schedule.upcoming.slice(0, 3)} states={planStates} compact />
            </section>
          )}
          <section>
            <SectionTitle>Повторить</SectionTitle>
            <div className="grid gap-2">
              <QuickLink href="/quiz/quick" icon={<Zap className="size-4" />} title="Быстрый тест" desc="5 случайных вопросов" />
              <QuickLink href="/hotkeys" icon={<Keyboard className="size-4" />} title="Тренажёр клавиш" desc="Photoshop и Illustrator" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-fg-2">{label}</dt>
      <dd className="min-w-0 truncate text-right">{children}</dd>
    </div>
  );
}

function MissedBanner({ missed }: { missed: StudentPlan[] }) {
  const n = missed.length;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-warning/25 bg-warning-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-warning" />
        <div>
          <p className="font-medium text-fg">
            Вы пропустили {n} {plural(n, "занятие", "занятия", "занятий")}
          </p>
          <p className="text-sm text-fg-2">{missed.map((m) => m.lesson.title).join(" · ")}</p>
        </div>
      </div>
      <LinkButton href={`/lessons/${missed[0].lesson.id}`} variant="primary" className="shrink-0">
        Продолжить курс
        <ArrowRight className="size-3.5" />
      </LinkButton>
    </div>
  );
}

function TodayCard({ plan, state, emphasize }: { plan: StudentPlan; state: LessonState; emphasize: boolean }) {
  const l = plan.lesson;
  const completed = state.status === "completed";
  const ctaHref = state.next?.href ?? `/lessons/${l.id}`;
  return (
    <Panel className="p-5 shadow sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-2">
        <span className="inline-flex items-center gap-1.5 font-medium text-accent">
          <span className="size-1.5 rounded-full bg-accent" />
          Сегодня
        </span>
        {plan.number && <span className="font-mono text-xs text-fg-3">Занятие {plan.number}</span>}
        <SoftwareLabel software={l.module.software} />
        <span className="text-fg-3">~{formatMinutes(l.estimatedMinutes)}</span>
      </div>
      <h2 className="mt-4 text-2xl font-semibold tracking-display text-balance">{l.title}</h2>
      {l.summary && <p className="mt-2 max-w-xl text-md text-fg-2">{l.summary}</p>}

      <div className="mt-6">
        <StepStrip state={state} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-fg-2 tnum">
          {completed ? "Тема завершена" : `${state.done} из ${state.total} шагов выполнено`}
        </span>
        <LinkButton href={completed ? `/lessons/${l.id}` : ctaHref} variant={emphasize ? "primary" : "secondary"} size="lg">
          {completed ? "Открыть тему" : state.done === 0 ? "Начать" : "Продолжить"}
          <ArrowRight className="size-4" />
        </LinkButton>
      </div>
    </Panel>
  );
}

function NoClassToday({ progress, upcoming }: { progress: CourseProgress | null; upcoming?: StudentPlan }) {
  const current = progress?.current;
  return (
    <Panel className="flex flex-col justify-between p-5 shadow sm:p-6">
      <div>
        <p className="text-sm text-fg-2">
          Сегодня занятий нет
          {upcoming && (
            <>
              {" · "}следующее — {relativeDay(upcoming.date).toLowerCase()}
            </>
          )}
        </p>
        {current ? (
          <>
            <div className="mt-4 flex items-center gap-2 text-sm text-fg-3">
              <SoftwareMark software={current.module.software} />
              {current.module.title}
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-display">{current.title}</h2>
            {current.summary && <p className="mt-2 max-w-xl text-md text-fg-2">{current.summary}</p>}
          </>
        ) : (
          <h2 className="mt-4 text-2xl font-semibold tracking-display">Все темы завершены</h2>
        )}
      </div>
      {current && (
        <div className="mt-6 flex justify-end">
          <LinkButton href={`/lessons/${current.id}`} variant="primary" size="lg">
            Продолжить
            <ArrowRight className="size-4" />
          </LinkButton>
        </div>
      )}
    </Panel>
  );
}

function ScheduleList({
  plans,
  states,
  compact,
}: {
  plans: StudentPlan[];
  states: Map<string, LessonState>;
  compact?: boolean;
}) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
      {plans.map((p) => {
        const s = states.get(p.lesson.id);
        return (
          <li key={p.id}>
            <Link
              href={`/lessons/${p.lesson.id}`}
              className="group flex items-center gap-3 px-4 py-3 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-muted"
            >
              <span className="w-16 shrink-0 font-mono text-xs whitespace-nowrap text-fg-3 tnum">{formatDayShort(p.date)}</span>
              <SoftwareMark software={p.lesson.module.software} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.lesson.title}</span>
              {!compact && s && (
                <span className="hidden font-mono text-xs text-fg-3 tnum sm:inline">
                  {s.done}/{s.total}
                </span>
              )}
              {s && !compact && <StatusIcon status={s.status} />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function QuickLink({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-3 transition-colors hover:border-border-strong"
    >
      <span className="inline-flex size-8 items-center justify-center rounded-md bg-muted text-fg-2 transition-colors group-hover:text-fg">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-fg-3">{desc}</span>
      </span>
      <ArrowRight className="size-3.5 text-fg-3 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
