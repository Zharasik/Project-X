import { requireStudent } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { BottomNav, TopNav } from "@/components/student/nav";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudent();
  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <TopNav />
          <div className="ml-auto flex items-center gap-3">
            <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-xs text-fg-2">
              {user.studentProfile.group.name}
            </span>
            <UserMenu name={user.name} subtitle={user.email} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <BottomNav />
    </div>
  );
}
