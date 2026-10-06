"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from "lucide-react";
import type { PublicQuestion, QuizResult } from "@/lib/quiz";
import { QUESTION_TYPE_LABEL } from "@/lib/quiz";
import { Button, LinkButton } from "@/components/ui/button";
import { Panel } from "@/components/ui/misc";
import { ProgressRing } from "@/components/ui/progress";
import { cn, plural } from "@/lib/utils";

type Answers = Record<string, string[]>;

export function QuizRunner({
  questions,
  onSubmit,
  passingScore,
  nextHref,
  nextLabel,
  restartHref,
}: {
  questions: PublicQuestion[];
  onSubmit: (answers: Answers) => Promise<QuizResult>;
  passingScore: number;
  nextHref?: string;
  nextLabel?: string;
  /** For quick quizzes a retry means new random questions → reload the page */
  restartHref?: string;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const q = questions[index];
  const selected = answers[q?.id] ?? [];
  const isLast = index === questions.length - 1;
  const answeredCount = questions.filter((x) => (answers[x.id] ?? []).length > 0).length;

  function choose(optionId: string) {
    setAnswers((prev) => {
      const cur = prev[q.id] ?? [];
      const next =
        q.type === "MULTIPLE" ? (cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId]) : [optionId];
      return { ...prev, [q.id]: next };
    });
  }

  function submit() {
    setError(null);
    start(async () => {
      try {
        setResult(await onSubmit(answers));
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        setError("Не удалось отправить ответы. Попробуйте ещё раз.");
      }
    });
  }

  function restart() {
    setAnswers({});
    setIndex(0);
    setResult(null);
  }

  if (result) {
    return <QuizResultView result={result} onRestart={restartHref ? undefined : restart} restartHref={restartHref} nextHref={nextHref} nextLabel={nextLabel} />;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="font-mono text-fg-2 tnum">
          Вопрос {index + 1} / {questions.length}
        </span>
        <span className="text-fg-3">Проходной балл — {passingScore}%</span>
      </div>
      <div className="mb-6 flex gap-1">
        {questions.map((x, i) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Вопрос ${i + 1}`}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i === index ? "bg-accent" : (answers[x.id] ?? []).length ? "bg-fg-3" : "bg-muted-2 hover:bg-border-strong",
            )}
          />
        ))}
      </div>

      <Panel className="p-5 sm:p-6">
        <p className="text-xs text-fg-3">{QUESTION_TYPE_LABEL[q.type]}</p>
        <h2 className="mt-2 text-lg font-semibold tracking-display text-balance">{q.text}</h2>
        <div className={cn("mt-5 grid gap-2", q.type === "TRUE_FALSE" && "sm:grid-cols-2")} role={q.type === "MULTIPLE" ? "group" : "radiogroup"}>
          {q.options.map((o, i) => {
            const active = selected.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                role={q.type === "MULTIPLE" ? "checkbox" : "radio"}
                aria-checked={active}
                onClick={() => choose(o.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-base transition-[border-color,background] duration-150",
                  active ? "border-accent bg-accent-soft" : "border-border hover:border-border-strong hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center border font-mono text-[10px] transition-colors",
                    q.type === "MULTIPLE" ? "rounded-[5px]" : "rounded-full",
                    active ? "border-accent bg-accent text-accent-fg" : "border-border-strong text-fg-3",
                  )}
                >
                  {active ? <Check className="size-3" strokeWidth={3} /> : String.fromCharCode(65 + i)}
                </span>
                {o.text}
              </button>
            );
          })}
        </div>
      </Panel>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ArrowLeft className="size-3.5" />
          Назад
        </Button>
        {isLast ? (
          <Button variant="primary" size="lg" onClick={submit} disabled={pending || answeredCount < questions.length}>
            {pending ? "Проверяем…" : answeredCount < questions.length ? `Ответьте на все вопросы (${answeredCount}/${questions.length})` : "Завершить тест"}
          </Button>
        ) : (
          <Button variant={selected.length ? "primary" : "secondary"} size="lg" onClick={() => setIndex((i) => i + 1)}>
            Далее
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function QuizResultView({
  result,
  onRestart,
  restartHref,
  nextHref,
  nextLabel,
}: {
  result: QuizResult;
  onRestart?: () => void;
  restartHref?: string;
  nextHref?: string;
  nextLabel?: string;
}) {
  const mistakes = result.total - result.correct;
  return (
    <div>
      <Panel className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="relative shrink-0 self-start">
          <ProgressRing value={result.percent} size={84} stroke={6} />
          <span className="absolute inset-0 flex items-center justify-center font-mono text-lg font-medium tnum">{result.percent}%</span>
        </div>
        <div className="flex-1">
          <p className={cn("text-sm font-medium", result.passed ? "text-success" : "text-warning")}>
            {result.passed ? "Тест пройден" : `Не хватило до ${result.passingScore}%`}
          </p>
          <p className="mt-1 text-lg font-semibold tracking-display">
            {result.correct} из {result.total} {plural(result.total, "ответа", "ответов", "ответов")} верно
          </p>
          <p className="text-sm text-fg-2">
            {mistakes === 0 ? "Без ошибок — отлично!" : `${mistakes} ${plural(mistakes, "ошибка", "ошибки", "ошибок")} — разбор ниже.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
          {result.passed && nextHref ? (
            <>
              <LinkButton href={nextHref} variant="primary" size="lg">
                {nextLabel ?? "Дальше"}
                <ArrowRight className="size-4" />
              </LinkButton>
              <RestartButton onRestart={onRestart} restartHref={restartHref} variant="ghost" />
            </>
          ) : (
            <RestartButton onRestart={onRestart} restartHref={restartHref} variant="primary" />
          )}
        </div>
      </Panel>

      <h3 className="mt-10 mb-3 text-xs font-medium tracking-wide text-fg-3 uppercase">Разбор ответов</h3>
      <ol className="space-y-3">
        {result.questions.map((q, i) => (
          <li key={q.id}>
            <Panel className={cn("p-5", !q.isCorrect && "border-danger/30")}>
              <div className="flex gap-3">
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                    q.isCorrect ? "bg-success text-surface" : "bg-danger text-surface",
                  )}
                >
                  {q.isCorrect ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    <span className="mr-2 font-mono text-xs text-fg-3">{i + 1}.</span>
                    {q.text}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {q.options.map((o) => {
                      const correct = q.correctIds.includes(o.id);
                      const chosen = q.selected.includes(o.id);
                      return (
                        <li
                          key={o.id}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm",
                            correct && "bg-success-soft text-fg",
                            chosen && !correct && "bg-danger-soft text-fg",
                            !correct && !chosen && "text-fg-3",
                          )}
                        >
                          <span className="w-4 shrink-0">
                            {correct ? <Check className="size-3.5 text-success" /> : chosen ? <X className="size-3.5 text-danger" /> : null}
                          </span>
                          <span className="flex-1">{o.text}</span>
                          {chosen && <span className="text-xs text-fg-3">ваш ответ</span>}
                        </li>
                      );
                    })}
                  </ul>
                  {q.explanation && <p className="mt-3 border-l-2 border-border-strong pl-3 text-sm text-fg-2">{q.explanation}</p>}
                </div>
              </div>
            </Panel>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RestartButton({
  onRestart,
  restartHref,
  variant,
}: {
  onRestart?: () => void;
  restartHref?: string;
  variant: "primary" | "ghost";
}) {
  if (restartHref) {
    return (
      <a href={restartHref} className={cn("inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-base font-medium transition-colors", variant === "primary" ? "bg-accent text-accent-fg hover:bg-accent-hover" : "text-fg-2 hover:bg-muted hover:text-fg")}>
        <RotateCcw className="size-4" />
        Новые вопросы
      </a>
    );
  }
  return (
    <Button variant={variant} size="lg" onClick={onRestart}>
      <RotateCcw className="size-4" />
      Пройти ещё раз
    </Button>
  );
}
