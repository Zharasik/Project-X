import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { TeacherMobileNav, TeacherSidebarNav } from "@/components/teacher/nav";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTeacher();
  const pending = await db.submission.count({
    where: { status: "SUBMITTED", student: { studentProfile: { group: { teacherId: user.teacherProfile.id } } } },
  });
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface px-3 py-4 lg:flex">
        <div className="px-2.5 pb-6">
          <Logo href="/teacher" />
        </div>
        <TeacherSidebarNav pending={pending} />
        <div className="mt-auto flex items-center gap-2 border-t border-border px-1 pt-3">
          <UserMenu name={user.name} subtitle={user.email} up />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-fg-3">Преподаватель</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-border bg-bg/90 px-4 pt-3 backdrop-blur lg:hidden">
          <div className="mb-2 flex items-center justify-between">
            <Logo href="/teacher" />
            <UserMenu name={user.name} subtitle={user.email} />
          </div>
          <TeacherMobileNav pending={pending} />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
