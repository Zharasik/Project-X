import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Clock, FileText, Monitor } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { SUBMISSION_STATUS, formatBytes, parseSteps } from "@/lib/practice";
import { getAccessibleLesson, getLessonState, touchLesson } from "@/lib/progress";
import { formatMinutes, pad2 } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Panel } from "@/components/ui/misc";
import { Markdown } from "@/components/markdown";
import { FavoriteButton } from "@/components/student/favorite-button";
import { LessonCrumbs } from "@/components/student/lesson-header";
import { STEP_LABEL } from "@/components/student/steps";
import { SubmitPracticeForm } from "./submit-form";
import { DeleteFileButton } from "./delete-file";

type Props = { params: Promise<{ lessonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lessonId } = await params;
  const p = await db.practice.findUnique({ where: { lessonId }, select: { title: true } });
  return { title: p?.title ?? "Практика" };
}

export default async function PracticePage({ params }: Props) {
  const { lessonId } = await params;
  const user = await requireStudent();
  const lesson = await getAccessibleLesson(user.studentProfile.groupId, lessonId);
  if (!lesson?.practice) notFound();
  const practice = lesson.practice;

  await touchLesson(user.id, lesson.id);
  const [submission, favorite, state] = await Promise.all([
    db.submission.findUnique({
      where: { practiceId_studentId: { practiceId: practice.id, studentId: user.id } },
      include: { files: { orderBy: { createdAt: "asc" } } },
    }),
    db.favorite.findFirst({ where: { userId: user.id, kind: "PRACTICE", lessonId: lesson.id } }),
    getLessonState(user.id, lesson.id),
  ]);
  const steps = parseSteps(practice.steps);
  const next = state?.steps.find((s) => s.key !== "practice" && s.state !== "done");
  const stepIndex = (state?.steps.findIndex((s) => s.key === "practice") ?? 1) + 1;
  const status = submission ? SUBMISSION_STATUS[submission.status] : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <LessonCrumbs lesson={lesson} step="Практика" />
        <FavoriteButton kind="PRACTICE" lessonId={lesson.id} active={!!favorite} />
      </div>

      <header className="mt-8">
        <p className="font-mono text-xs text-fg-3">{pad2(stepIndex)} — Практическое задание</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-display text-balance">{practice.title}</h1>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-2">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 text-fg-3" />~{formatMinutes(practice.estimatedMinutes)}
          </span>
          {practice.software.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Monitor className="size-3.5 text-fg-3" />
              {practice.software.join(", ")}
            </span>
          )}
          {status && <Badge tone={status.tone}>{status.label}</Badge>}
        </div>
      </header>

      {practice.goal && (
        <section className="mt-8 rounded-lg border border-border bg-surface px-5 py-4">
          <p className="text-xs font-medium tracking-wide text-fg-3 uppercase">Цель</p>
          <p className="mt-1 text-md">{practice.goal}</p>
        </section>
      )}

      {steps.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-5 text-lg font-semibold tracking-display">Пошаговая инструкция</h2>
          <ol className="relative space-y-8 before:absolute before:top-2 before:bottom-2 before:left-[13px] before:w-px before:bg-border">
            {steps.map((s, i) => (
              <li key={i} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-4">
                <span className="relative z-10 inline-flex size-7 items-center justify-center rounded-full border border-border-strong bg-bg font-mono text-xs text-fg-2">
                  {i + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <h3 className="font-semibold">{s.title}</h3>
                  {s.body && <Markdown className="mt-1.5 !text-[15px] !leading-relaxed text-fg-2">{s.body}</Markdown>}
                  {s.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.imageUrl} alt={s.title} className="mt-3 w-full rounded-lg border border-border" loading="lazy" />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {practice.requirements.length > 0 && (
          <Checklist title="Требования к результату" items={practice.requirements} />
        )}
        {practice.criteria.length > 0 && <Checklist title="Критерии проверки" items={practice.criteria} />}
      </div>

      <section id="submit" className="mt-12 scroll-mt-20">
        <h2 className="mb-4 text-lg font-semibold tracking-display">Сдача работы</h2>

        {submission && (
          <Panel className="mb-4 divide-y divide-border">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Badge tone={status!.tone}>{status!.label}</Badge>
                <span className="text-sm text-fg-2">Отправлено {formatDateTime(submission.submittedAt)}</span>
              </div>
              {submission.status !== "NEEDS_REVISION" && next && (
                <LinkButton href={next.href} variant="primary">
                  Дальше: {STEP_LABEL[next.key]}
                  <ArrowRight className="size-3.5" />
                </LinkButton>
              )}
            </div>
            {submission.feedback && (
              <div className="px-5 py-3.5">
                <p className="text-xs font-medium tracking-wide text-fg-3 uppercase">Комментарий преподавателя</p>
                <p className="mt-1 text-sm whitespace-pre-line">{submission.feedback}</p>
              </div>
            )}
            {(submission.files.length > 0 || submission.link) && (
              <ul className="space-y-1 px-5 py-3.5">
                {submission.files.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 text-sm">
                    <FileText className="size-3.5 text-fg-3" />
                    <a href={`/api/files/${f.id}`} className="min-w-0 flex-1 truncate hover:text-accent" target="_blank" rel="noreferrer">
                      {f.fileName}
                    </a>
                    <span className="font-mono text-xs text-fg-3">{formatBytes(f.size)}</span>
                    {submission.status !== "ACCEPTED" && <DeleteFileButton fileId={f.id} />}
                  </li>
                ))}
                {submission.link && (
                  <li className="truncate text-sm">
                    <a href={submission.link} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      {submission.link}
                    </a>
                  </li>
                )}
              </ul>
            )}
          </Panel>
        )}

        {submission?.status === "ACCEPTED" ? null : (
          <Panel className="p-5">
            {submission?.status === "NEEDS_REVISION" && (
              <p className="mb-4 text-sm text-warning">Работа возвращена на доработку. Исправьте и отправьте снова.</p>
            )}
            <SubmitPracticeForm
              lessonId={lesson.id}
              allowUpload={practice.allowUpload}
              resubmit={!!submission}
              defaults={{ comment: submission?.comment ?? "", link: submission?.link ?? "" }}
            />
          </Panel>
        )}
      </section>
    </div>
  );
}

function Checklist({ title, items }: { title: string; items: string[] }) {
  return (
    <Panel className="p-5">
      <h3 className="text-xs font-medium tracking-wide text-fg-3 uppercase">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2.5 text-sm">
            <span className="mt-[9px] size-1 shrink-0 rounded-full bg-fg-3" />
            {it}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
