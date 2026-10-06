import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { regenerateInviteCode } from "@/lib/actions/teacher";
import { getGroupProgress } from "@/lib/teacher";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Panel } from "@/components/ui/misc";
import { ProgressBar } from "@/components/ui/progress";
import { StatusIcon } from "@/components/ui/status";
import { Select } from "@/components/ui/form";
import { ActionButton } from "@/components/teacher/action-button";

export const metadata: Metadata = { title: "Группа" };

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { groupId } = await params;
  const { lesson: lessonParam } = await searchParams;
  const user = await requireTeacher();
  const owned = await db.group.findFirst({ where: { id: groupId, teacherId: user.teacherProfile.id } });
  if (!owned) notFound();
  const data = await getGroupProgress(groupId);
  if (!data) notFound();
  const { group, lessons, rows } = data;

  const focus = lessons.find((l) => l.id === lessonParam) ?? null;
  const KEYS = ["lecture", "practice", "quiz", "hotkeys"] as const;
  const LABELS = { lecture: "Лекция", practice: "Практика", quiz: "Тест", hotkeys: "Клавиши" };

  return (
    <>
      <Link href="/teacher/groups" className="inline-flex items-center gap-1 text-sm text-fg-3 hover:text-fg">
        <ChevronLeft className="size-4" /> Группы
      </Link>
      <header className="mt-3 mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-mono text-xl font-semibold">{group.name}</h1>
          <p className="mt-1 text-sm text-fg-2">{rows.length} студентов</p>
        </div>
        <Panel className="flex items-center gap-3 px-4 py-2.5">
          <span className="text-sm text-fg-2">Код для регистрации</span>
          <span className="font-mono text-md font-semibold tracking-wide select-all">{group.inviteCode}</span>
          <ActionButton action={regenerateInviteCode.bind(null, group.id)} confirm="Создать новый код? Старый перестанет работать." title="Новый код">
            <RefreshCw className="size-3.5" />
          </ActionButton>
        </Panel>
      </header>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="">
        <span className="text-sm text-fg-2">Статус по теме:</span>
        <Select name="lesson" defaultValue={focus?.id ?? ""} className="w-auto min-w-64">
          <option value="">— общий прогресс —</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.module.title} · {l.title}
            </option>
          ))}
        </Select>
        <button className="h-9 rounded-md border border-border bg-surface px-3 text-sm hover:bg-muted">Показать</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="В группе пока нет студентов" description={`Дайте студентам код ${group.inviteCode} для регистрации.`} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-fg-3">
                <th className="px-4 py-2.5 font-medium">Студент</th>
                {focus ? (
                  KEYS.map((k) => (
                    <th key={k} className="px-3 py-2.5 text-center font-medium">
                      {LABELS[k]}
                    </th>
                  ))
                ) : (
                  <>
                    <th className="w-56 px-4 py-2.5 font-medium">Прогресс курса</th>
                    <th className="px-4 py-2.5 text-right font-medium">Тесты, ср.</th>
                    <th className="px-4 py-2.5 text-right font-medium">На проверке</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const st = focus ? r.states.get(focus.id) : null;
                return (
                  <tr key={r.user.id} className="transition-colors hover:bg-muted">
                    <td className="px-4 py-2.5">
                      <Link href={`/teacher/students/${r.user.id}`} className="font-medium hover:text-accent">
                        {r.user.name}
                      </Link>
                    </td>
                    {focus ? (
                      KEYS.map((k) => {
                        const step = st?.steps.find((s) => s.key === k);
                        return (
                          <td key={k} className="px-3 py-2.5 text-center">
                            {step ? <StatusIcon status={step.state} className="inline" /> : <span className="text-fg-3">—</span>}
                          </td>
                        );
                      })
                    ) : (
                      <>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <ProgressBar value={r.percent} className="flex-1" />
                            <span className="w-14 text-right font-mono text-xs text-fg-2 tnum">
                              {r.completed}/{lessons.length}
                            </span>
                          </div>
                        </td>
                        <td className={cn("px-4 py-2.5 text-right font-mono tnum", r.quizAvg != null && r.quizAvg < 70 && "text-warning")}>
                          {r.quizAvg != null ? `${r.quizAvg}%` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">{r.pending > 0 ? <Badge tone="accent">{r.pending}</Badge> : <span className="text-fg-3">—</span>}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
