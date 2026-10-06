import "server-only";
import { db } from "@/lib/db";

export async function getPlanFormData(teacherId: string) {
  const [groups, courses] = await Promise.all([
    db.group.findMany({ where: { teacherId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.course.findMany({
      where: { teacherId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        modules: {
          orderBy: { order: "asc" },
          select: { id: true, title: true, lessons: { orderBy: { order: "asc" }, select: { id: true, title: true } } },
        },
      },
    }),
  ]);
  return { groups, courses };
}
