import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma, SubmissionStatus } from "@prisma/client";
import { ExternalLink, FileText } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { SUBMISSION_STATUS, formatBytes } from "@/lib/practice";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Panel } from "@/components/ui/misc";
import { ReviewForm } from "@/components/teacher/review-form";

export const metadata: Metadata = { title: "Проверка работ" };

const FILTERS: { key: SubmissionStatus | "ALL"; label: string }[] = [
  { key: "SUBMITTED", label: "На проверке" },
  { key: "NEEDS_REVISION", label: "На доработке" },
  { key: "ACCEPTED", label: "Принятые" },
  { key: "ALL", label: "Все" },
];

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<{ status?: string; id?: string; group?: string; reviewed?: string }> }) {
  const user = await requireTeacher();
  const sp = await searchParams;
  const teacherId = user.teacherProfile.id;
  const status = FILTERS.some((f) => f.key === sp.status) ? (sp.status as SubmissionStatus | "ALL") : "SUBMITTED";

  const groups = await db.group.findMany({ where: { teacherId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const where: Prisma.SubmissionWhereInput = {
    student: { studentProfile: { group: { teacherId, ...(sp.group ? { id: sp.group } : {}) } } },
    ...(status === "ALL" ? {} : { status }),
  };
  const submissions = await db.submission.findMany({
    where,
    orderBy: { submittedAt: status === "SUBMITTED" ? "asc" : "desc" },
    take: 100,
    include: {
      student: { select: { id: true, name: true, studentProfile: { select: { group: { select: { name: true } } } } } },
      practice: { select: { title: true, criteria: true, lesson: { select: { title: true } } } },
      files: true,
    },
  });
  const selected = submissions.find((s) => s.id === sp.id) ?? (sp.id ? await db.submission.findFirst({ where: { ...where, id: sp.id }, include: { student: { select: { id: true, name: true, studentProfile: { select: { group: { select: { name: true } } } } } }, practice: { select: { title: true, criteria: true, lesson: { select: { title: true } } } }, files: true } }) : null) ?? submissions[0] ?? null;

  const reviewed = sp.reviewed
    ? await db.submission.findFirst({
        where: { id: sp.reviewed, student: { studentProfile: { group: { teacherId } } } },
        select: { id: true, status: true, student: { select: { name: true } } },
      })
    : null;

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string | undefined> = { status, group: sp.group, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/teacher/submissions?${p}`;
  };

  return (
    <>
      <PageHeader title="Проверка работ" />
      {reviewed && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-success/25 bg-success-soft px-4 py-2.5 text-sm">
          <span className="text-success">✓</span>
          <span>
            {reviewed.student.name}: {reviewed.status === "ACCEPTED" ? "работа принята" : "отправлено на доработку"}
          </span>
          <Link href={qs({ status: "ALL", id: reviewed.id, reviewed: undefined })} className="ml-auto text-fg-2 hover:text-fg">
            Открыть
          </Link>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={qs({ status: f.key, id: undefined })}
            className={cn("inline-flex h-8 items-center rounded-md px-3 text-sm", status === f.key ? "bg-fg text-bg" : "text-fg-2 hover:bg-muted")}
          >
            {f.label}
          </Link>
        ))}
        <span className="mx-2 h-4 w-px bg-border" />
        {[{ id: undefined, name: "Все группы" }, ...groups].map((g) => (
          <Link
            key={g.id ?? "all"}
            href={qs({ group: g.id, id: undefined })}
            className={cn("inline-flex h-8 items-center rounded-md px-3 font-mono text-xs", sp.group === g.id ? "bg-muted-2 text-fg" : "text-fg-2 hover:bg-muted")}
          >
            {g.name}
          </Link>
        ))}
      </div>

      {submissions.length === 0 && !selected ? (
        <EmptyState title="Работ нет" description={status === "SUBMITTED" ? "Все работы проверены." : undefined} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <ul className="max-h-[75vh] divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface">
            {submissions.map((s) => (
              <li key={s.id}>
                <Link href={qs({ id: s.id })} className={cn("block px-4 py-3 transition-colors hover:bg-muted", selected?.id === s.id && "bg-accent-soft/60")}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{s.student.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-fg-3">{s.student.studentProfile?.group.name}</span>
                  </span>
                  <span className="block truncate text-xs text-fg-2">{s.practice.lesson.title}</span>
                  <span className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-[11px] text-fg-3">{formatDateTime(s.submittedAt)}</span>
                    {status === "ALL" && <Badge tone={SUBMISSION_STATUS[s.status].tone}>{SUBMISSION_STATUS[s.status].label}</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {selected && (
            <Panel className="h-fit">
              <div className="border-b border-border px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/teacher/students/${selected.student.id}`} className="font-semibold hover:text-accent">
                    {selected.student.name}
                  </Link>
                  <Badge tone={SUBMISSION_STATUS[selected.status].tone}>{SUBMISSION_STATUS[selected.status].label}</Badge>
                </div>
                <p className="text-sm text-fg-2">
                  {selected.practice.lesson.title} · {selected.practice.title}
                </p>
                <p className="mt-1 font-mono text-xs text-fg-3">Отправлено {formatDateTime(selected.submittedAt)}</p>
              </div>
              <div className="space-y-5 px-5 py-4">
                {selected.files.some((f) => f.mimeType.startsWith("image/") && f.mimeType !== "image/svg+xml") && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selected.files
                      .filter((f) => f.mimeType.startsWith("image/") && f.mimeType !== "image/svg+xml")
                      .map((f) => (
                        <a key={f.id} href={`/api/files/${f.id}`} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/api/files/${f.id}`} alt={f.fileName} className="aspect-[4/3] w-full rounded-md border border-border bg-muted object-contain" />
                        </a>
                      ))}
                  </div>
                )}
                {(selected.files.length > 0 || selected.link) && (
                  <ul className="space-y-1">
                    {selected.files.map((f) => (
                      <li key={f.id} className="flex items-center gap-2 text-sm">
                        <FileText className="size-3.5 text-fg-3" />
                        <a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:text-accent">
                          {f.fileName}
                        </a>
                        <span className="font-mono text-xs text-fg-3">{formatBytes(f.size)}</span>
                      </li>
                    ))}
                    {selected.link && (
                      <li className="flex items-center gap-2 text-sm">
                        <ExternalLink className="size-3.5 text-fg-3" />
                        <a href={selected.link} target="_blank" rel="noreferrer" className="truncate text-accent hover:underline">
                          {selected.link}
                        </a>
                      </li>
                    )}
                  </ul>
                )}
                {selected.files.length === 0 && !selected.link && <p className="text-sm text-fg-3">Студент отметил задание выполненным без файлов.</p>}
                {selected.comment && (
                  <div>
                    <p className="text-xs font-medium tracking-wide text-fg-3 uppercase">Комментарий студента</p>
                    <p className="mt-1 text-sm whitespace-pre-line">{selected.comment}</p>
                  </div>
                )}
                {selected.practice.criteria.length > 0 && (
                  <div>
                    <p className="text-xs font-medium tracking-wide text-fg-3 uppercase">Критерии проверки</p>
                    <ul className="mt-1 space-y-0.5 text-sm text-fg-2">
                      {selected.practice.criteria.map((c, i) => (
                        <li key={i}>— {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="border-t border-border pt-4">
                  <ReviewForm key={selected.id} submissionId={selected.id} feedback={selected.feedback} />
                </div>
              </div>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}
