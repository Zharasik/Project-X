import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft, Trash2 } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { deletePlan } from "@/lib/actions/teacher";
import { dateToISO, formatDay } from "@/lib/dates";
import { getPlanFormData } from "@/lib/teacher-plans";
import { getLessonGroupStats } from "@/lib/teacher";
import { Panel } from "@/components/ui/misc";
import { ActionButton } from "@/components/teacher/action-button";
import { PlanForm } from "@/components/teacher/plan-form";
import { StepMeter } from "@/components/teacher/step-meter";

export const metadata: Metadata = { title: "Занятие" };

export default async function EditPlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const user = await requireTeacher();
  const plan = await db.dailyPlan.findFirst({
    where: { id: planId, group: { teacherId: user.teacherProfile.id } },
    include: { items: { orderBy: { order: "asc" } }, group: { include: { students: { select: { userId: true } } } }, lesson: true },
  });
  if (!plan) notFound();
  const [{ groups, courses }, stats] = await Promise.all([
    getPlanFormData(user.teacherProfile.id),
    getLessonGroupStats(plan.lessonId, plan.group.students.map((s) => s.userId)),
  ]);

  return (
    <>
      <Link href="/teacher/plans" className="inline-flex items-center gap-1 text-sm text-fg-3 hover:text-fg">
        <ChevronLeft className="size-4" /> План занятий
      </Link>
      <header className="mt-3 mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-display">
          {formatDay(plan.date)} · <span className="font-mono">{plan.group.name}</span>
        </h1>
        <ActionButton action={deletePlan.bind(null, plan.id)} confirm="Удалить занятие из плана?" variant="danger">
          <Trash2 className="size-3.5" /> Удалить
        </ActionButton>
      </header>
      <Panel className="mb-6 grid gap-4 p-5 sm:grid-cols-3">
        <StepMeter label="Лекция" value={stats.lecture} total={stats.students} muted={!stats.hasLecture} />
        <StepMeter label="Практика" value={stats.practice} total={stats.students} muted={!stats.hasPractice} />
        <StepMeter label="Тест" value={stats.quiz} total={stats.students} muted={!stats.hasQuiz} />
      </Panel>
      <PlanForm
        plan={{ ...plan, date: dateToISO(plan.date), items: plan.items.map(({ start, end, title }) => ({ start, end, title })) }}
        groups={groups}
        courses={courses}
        defaults={{ date: dateToISO(plan.date) }}
      />
    </>
  );
}
