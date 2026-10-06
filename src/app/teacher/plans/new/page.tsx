import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDaysISO, todayISO } from "@/lib/dates";
import { getPlanFormData } from "@/lib/teacher-plans";
import { EmptyState } from "@/components/ui/misc";
import { PlanForm } from "@/components/teacher/plan-form";

export const metadata: Metadata = { title: "Новое занятие" };

export default async function NewPlanPage({ searchParams }: { searchParams: Promise<{ lesson?: string; group?: string }> }) {
  const user = await requireTeacher();
  const sp = await searchParams;
  const { groups, courses } = await getPlanFormData(user.teacherProfile.id);
  const groupId = sp.group ?? groups[0]?.id;

  // Sensible defaults: the day after the group's last class, next lesson in order, next number.
  const last = groupId
    ? await db.dailyPlan.findFirst({ where: { groupId }, orderBy: { date: "desc" }, include: { lesson: true } })
    : null;
  let lessonId = sp.lesson;
  if (!lessonId && last) {
    const flat = courses.flatMap((c) => c.modules.flatMap((m) => m.lessons));
    const i = flat.findIndex((l) => l.id === last.lessonId);
    lessonId = flat[i + 1]?.id;
  }
  const lastISO = last ? last.date.toISOString().slice(0, 10) : null;
  const date = lastISO && lastISO >= todayISO() ? addDaysISO(lastISO, 1) : todayISO();

  return (
    <>
      <Link href="/teacher/plans" className="inline-flex items-center gap-1 text-sm text-fg-3 hover:text-fg">
        <ChevronLeft className="size-4" /> План занятий
      </Link>
      <h1 className="mt-3 mb-8 text-xl font-semibold tracking-display">Новое занятие</h1>
      {groups.length === 0 ? (
        <EmptyState title="Сначала создайте группу" />
      ) : (
        <PlanForm groups={groups} courses={courses} defaults={{ date, lessonId, groupId, number: last?.number ? last.number + 1 : undefined }} />
      )}
    </>
  );
}
