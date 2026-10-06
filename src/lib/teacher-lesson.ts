import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";

/** Lesson owned by the current teacher, shared by the editor layout and tabs. */
export const getTeacherLesson = cache(async (lessonId: string) => {
  const user = await requireTeacher();
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, module: { course: { teacherId: user.teacherProfile.id } } },
    include: {
      module: { include: { course: { select: { id: true, title: true } } } },
      lecture: true,
      practice: true,
      quiz: { include: { questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } } } },
      hotkeys: { select: { hotkeyId: true } },
    },
  });
  if (!lesson) notFound();
  return lesson;
});
