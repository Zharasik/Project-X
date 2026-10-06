import Link from "next/link";
import type { Metadata } from "next";
import { requireTeacher } from "@/lib/auth";
import { getTeacherGroups } from "@/lib/teacher";
import { plural } from "@/lib/utils";
import { EmptyState, PageHeader, Panel } from "@/components/ui/misc";
import { CreateGroupForm } from "@/components/teacher/forms";

export const metadata: Metadata = { title: "Группы" };

export default async function GroupsPage() {
  const user = await requireTeacher();
  const groups = await getTeacherGroups(user.teacherProfile.id);
  return (
    <>
      <PageHeader title="Группы" description="Студенты регистрируются сами по коду группы." />
      <Panel className="mb-6 p-4">
        <CreateGroupForm />
      </Panel>
      {groups.length === 0 ? (
        <EmptyState title="Групп пока нет" />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {groups.map((g) => (
            <li key={g.id}>
              <Link href={`/teacher/groups/${g.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted">
                <span className="w-24 font-mono font-semibold">{g.name}</span>
                <span className="flex-1 text-sm text-fg-2">{g.courses.map((c) => c.course.title).join(", ") || "курс не назначен"}</span>
                <span className="text-sm text-fg-2 tnum">
                  {g.students.length} {plural(g.students.length, "студент", "студента", "студентов")}
                </span>
                <span className="hidden font-mono text-xs text-fg-3 sm:inline">{g.inviteCode}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
