import "server-only";
import { db } from "@/lib/db";
import { todayDate } from "@/lib/dates";
import type { LessonState } from "@/lib/progress";

/**
 * Student-facing view of the group's schedule.
 * Never exposes plan items (timing) or teacher notes.
 */
export async function getGroupSchedule(groupId: string) {
  const plans = await db.dailyPlan.findMany({
    where: { groupId, lesson: { published: true, module: { published: true } } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      date: true,
      number: true,
      lesson: {
        select: {
          id: true,
          title: true,
          summary: true,
          estimatedMinutes: true,
          module: { select: { title: true, software: true, courseId: true } },
        },
      },
    },
  });

  const today = todayDate().getTime();
  return {
    today: plans.filter((p) => p.date.getTime() === today),
    past: plans.filter((p) => p.date.getTime() < today),
    upcoming: plans.filter((p) => p.date.getTime() > today),
  };
}

export type StudentPlan = Awaited<ReturnType<typeof getGroupSchedule>>["past"][number];

/** Past classes whose lesson the student hasn't completed (one per lesson). */
export function getMissed(past: StudentPlan[], states: Map<string, LessonState>) {
  const seen = new Set<string>();
  return past.filter((p) => {
    if (seen.has(p.lesson.id)) return false;
    seen.add(p.lesson.id);
    return states.get(p.lesson.id)?.status !== "completed";
  });
}
