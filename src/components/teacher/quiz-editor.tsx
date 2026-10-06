"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import type { QuestionType } from "@prisma/client";
import { deleteQuestion, moveQuestion, saveQuestion, saveQuizSettings, type ActionState } from "@/lib/actions/teacher";
import { QUESTION_TYPE_LABEL } from "@/lib/quiz";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { Panel } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { SaveBar } from "./save-bar";

export interface EditableQuestion {
  id?: string;
  type: QuestionType;
  text: string;
  explanation: string;
  options: { text: string; isCorrect: boolean }[];
}

export function QuizSettingsForm({ lessonId, quiz }: { lessonId: string; quiz: { title: string; passingScore: number } | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveQuizSettings.bind(null, lessonId), undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_160px_auto] sm:items-end">
      <Field label="Название теста">
        <Input name="title" defaultValue={quiz?.title ?? "Тест"} />
      </Field>
      <Field label="Проходной балл, %">
        <Input name="passingScore" type="number" min={1} max={100} defaultValue={quiz?.passingScore ?? 70} />
      </Field>
      <SaveBar pending={pending} state={state} className="[&>div]:mt-0" />
    </form>
  );
}

const blank = (): EditableQuestion => ({
  type: "SINGLE",
  text: "",
  explanation: "",
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
});

function QuestionForm({ lessonId, initial, onDone }: { lessonId: string; initial: EditableQuestion; onDone: () => void }) {
  const [q, setQ] = useState<EditableQuestion>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function setType(type: QuestionType) {
    setQ((prev) => {
      if (type === "TRUE_FALSE") return { ...prev, type, options: [{ text: "Верно", isCorrect: true }, { text: "Неверно", isCorrect: false }] };
      if (prev.type === "TRUE_FALSE") return { ...prev, type, options: blank().options };
      if (type === "SINGLE") {
        const first = prev.options.findIndex((o) => o.isCorrect);
        return { ...prev, type, options: prev.options.map((o, i) => ({ ...o, isCorrect: i === Math.max(0, first) })) };
      }
      return { ...prev, type };
    });
  }

  function toggleCorrect(i: number) {
    setQ((prev) => ({
      ...prev,
      options: prev.options.map((o, j) => (prev.type === "MULTIPLE" ? (j === i ? { ...o, isCorrect: !o.isCorrect } : o) : { ...o, isCorrect: j === i })),
    }));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <Field label="Вопрос">
          <Textarea value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} rows={2} autoFocus />
        </Field>
        <Field label="Тип">
          <Select value={q.type} onChange={(e) => setType(e.target.value as QuestionType)}>
            {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-medium">Варианты ответа</span>
        <p className="mb-2 text-xs text-fg-3">Отметьте правильный{q.type === "MULTIPLE" ? "(-ые)" : ""} ответ слева.</p>
        <ul className="space-y-2">
          {q.options.map((o, i) => (
            <li key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleCorrect(i)}
                aria-label="Правильный ответ"
                className={cn(
                  "inline-flex size-6 shrink-0 items-center justify-center border transition-colors",
                  q.type === "MULTIPLE" ? "rounded-md" : "rounded-full",
                  o.isCorrect ? "border-success bg-success text-surface" : "border-border-strong text-transparent hover:border-fg-3",
                )}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </button>
              <Input
                value={o.text}
                disabled={q.type === "TRUE_FALSE"}
                onChange={(e) => setQ({ ...q, options: q.options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                placeholder={`Вариант ${i + 1}`}
              />
              {q.type !== "TRUE_FALSE" && q.options.length > 2 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setQ({ ...q, options: q.options.filter((_, j) => j !== i) })} aria-label="Удалить вариант">
                  <X className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {q.type !== "TRUE_FALSE" && q.options.length < 8 && (
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setQ({ ...q, options: [...q.options, { text: "", isCorrect: false }] })}>
            <Plus className="size-3.5" /> Вариант
          </Button>
        )}
      </div>
      <Field label="Пояснение после ответа" hint="Необязательно. Студент увидит его в разборе.">
        <Input value={q.explanation} onChange={(e) => setQ({ ...q, explanation: e.target.value })} />
      </Field>
      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Отмена
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveQuestion(lessonId, q);
              if (r?.error) setError(r.error);
              else onDone();
            })
          }
        >
          {pending ? "Сохраняем…" : "Сохранить вопрос"}
        </Button>
      </div>
    </div>
  );
}

export function QuestionList({ lessonId, questions }: { lessonId: string; questions: (EditableQuestion & { id: string })[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [, start] = useTransition();
  return (
    <div className="space-y-2">
      {questions.map((q, i) =>
        editing === q.id ? (
          <Panel key={q.id} className="p-4">
            <QuestionForm lessonId={lessonId} initial={q} onDone={() => setEditing(null)} />
          </Panel>
        ) : (
          <Panel key={q.id} className="group flex gap-3 p-4">
            <span className="mt-0.5 font-mono text-xs text-fg-3 tnum">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{q.text}</p>
              <p className="mt-0.5 text-xs text-fg-3">{QUESTION_TYPE_LABEL[q.type]}</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {q.options.map((o, j) => (
                  <li key={j} className={cn("rounded-sm px-1.5 text-xs leading-5", o.isCorrect ? "bg-success-soft text-success" : "bg-muted text-fg-2")}>
                    {o.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex shrink-0 items-start">
              <Button variant="ghost" size="sm" onClick={() => start(() => moveQuestion(lessonId, q.id, "up"))} aria-label="Выше">
                <ArrowUp className="size-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => start(() => moveQuestion(lessonId, q.id, "down"))} aria-label="Ниже">
                <ArrowDown className="size-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(q.id)} aria-label="Изменить">
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Удалить"
                onClick={() => {
                  if (window.confirm("Удалить вопрос?")) start(() => deleteQuestion(lessonId, q.id));
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </Panel>
        ),
      )}
      {editing === "new" ? (
        <Panel className="p-4">
          <QuestionForm lessonId={lessonId} initial={blank()} onDone={() => setEditing(null)} />
        </Panel>
      ) : (
        <Button variant="secondary" onClick={() => setEditing("new")}>
          <Plus className="size-3.5" /> Вопрос
        </Button>
      )}
    </div>
  );
}
