import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { getStudentCourses } from "@/lib/progress";
import { EmptyState, PageHeader } from "@/components/ui/misc";

export default async function CoursesPage() {
  const user = await requireStudent();
  const courses = await getStudentCourses(user.studentProfile.groupId);
  if (courses.length === 1) redirect(`/courses/${courses[0].id}`);

  return (
    <>
      <PageHeader title="Курсы" />
      {courses.length === 0 ? (
        <EmptyState title="Курсов пока нет" description="Преподаватель ещё не назначил курс вашей группе." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {courses.map((c) => (
            <li key={c.id}>
              <Link href={`/courses/${c.id}`} className="block rounded-lg border border-border bg-surface p-5 transition-colors hover:border-border-strong">
                <p className="font-medium">{c.title}</p>
                <p className="mt-1 text-sm text-fg-2">{c.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
