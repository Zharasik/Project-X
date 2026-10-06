"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { saveLecture, savePractice, setLessonHotkeys, updateLesson, type ActionState } from "@/lib/actions/teacher";
import type { PracticeStep } from "@/lib/practice";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { KeyCombo } from "@/components/ui/misc";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";
import { SaveBar } from "./save-bar";

export function LessonSettingsForm({
  lesson,
  modules,
}: {
  lesson: { id: string; title: string; summary: string; estimatedMinutes: number; published: boolean; moduleId: string };
  modules: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateLesson.bind(null, lesson.id), undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Название темы">
        <Input name="title" defaultValue={lesson.title} required />
      </Field>
      <Field label="Краткое описание" hint="Показывается студенту в списке тем и в блоке «Сегодня»">
        <Textarea name="summary" rows={2} defaultValue={lesson.summary} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Примерное время, мин">
          <Input name="estimatedMinutes" type="number" min={5} defaultValue={lesson.estimatedMinutes} />
        </Field>
        <Field label="Модуль">
          <Select name="moduleId" defaultValue={lesson.moduleId}>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Checkbox name="published" label="Опубликовано — студенты видят тему" defaultChecked={lesson.published} />
      <SaveBar pending={pending} state={state} />
    </form>
  );
}

const MD_HELP = [
  ["## Заголовок", "раздел (попадает в оглавление)"],
  ["**жирный**", "выделение"],
  ["- пункт", "список"],
  ["![подпись](/путь.png)", "изображение"],
  ["[текст](https://…)", "ссылка"],
  ["> [!TIP]", "блок-подсказка: NOTE, TIP, WARNING"],
  ["https://youtu.be/…", "отдельной строкой — видео"],
];

export function LectureEditor({ lessonId, lecture }: { lessonId: string; lecture: { body: string; estimatedMinutes: number } | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveLecture.bind(null, lessonId), undefined);
  const [body, setBody] = useState(lecture?.body ?? "");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  return (
    <form action={action}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <Field label="Время чтения, мин" className="w-40">
          <Input name="estimatedMinutes" type="number" min={1} defaultValue={lecture?.estimatedMinutes ?? 15} />
        </Field>
        <div className="flex rounded-md border border-border p-0.5 lg:hidden">
          {(["edit", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn("inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-sm", mode === m ? "bg-muted font-medium" : "text-fg-2")}
            >
              {m === "edit" ? <Pencil className="size-3.5" /> : <Eye className="size-3.5" />}
              {m === "edit" ? "Текст" : "Превью"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn(mode === "preview" && "hidden lg:block")}>
          <Textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[60vh] font-mono text-sm leading-relaxed"
            placeholder="Текст лекции в Markdown…"
          />
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-fg-3 hover:text-fg">Шпаргалка по разметке</summary>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              {MD_HELP.map(([code, desc]) => (
                <div key={code} className="contents">
                  <dt className="font-mono text-xs text-fg">{code}</dt>
                  <dd className="text-xs text-fg-3">{desc}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
        <div className={cn("max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-surface p-6", mode === "edit" && "hidden lg:block")}>
          {body.trim() ? <Markdown className="!text-[15px]">{body}</Markdown> : <p className="text-sm text-fg-3">Здесь появится превью лекции.</p>}
        </div>
      </div>
      <SaveBar pending={pending} state={state} label="Сохранить лекцию" className="mt-4" />
    </form>
  );
}

export function PracticeEditor({
  lessonId,
  practice,
}: {
  lessonId: string;
  practice: {
    title: string;
    goal: string;
    estimatedMinutes: number;
    software: string[];
    steps: PracticeStep[];
    requirements: string[];
    criteria: string[];
    allowUpload: boolean;
  } | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(savePractice.bind(null, lessonId), undefined);
  const [steps, setSteps] = useState<PracticeStep[]>(practice?.steps.length ? practice.steps : [{ title: "", body: "" }]);

  const update = (i: number, patch: Partial<PracticeStep>) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) =>
    setSteps((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const n = [...s];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />
      <section className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Field label="Название задания">
          <Input name="title" defaultValue={practice?.title} required />
        </Field>
        <Field label="Время, мин">
          <Input name="estimatedMinutes" type="number" min={1} defaultValue={practice?.estimatedMinutes ?? 40} />
        </Field>
        <Field label="Цель" className="sm:col-span-2">
          <Textarea name="goal" rows={2} defaultValue={practice?.goal} />
        </Field>
        <Field label="Необходимое ПО" hint="Каждое с новой строки" className="sm:col-span-2">
          <Textarea name="software" rows={2} defaultValue={practice?.software.join("\n")} placeholder="Adobe Photoshop 2024+" />
        </Field>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Пошаговая инструкция</h3>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)_auto] gap-3 rounded-lg border border-border bg-surface p-3">
              <span className="mt-2 inline-flex size-6 items-center justify-center rounded-full border border-border-strong font-mono text-xs text-fg-2">
                {i + 1}
              </span>
              <div className="space-y-2">
                <Input value={s.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Заголовок шага" />
                <Textarea value={s.body} onChange={(e) => update(i, { body: e.target.value })} rows={2} placeholder="Описание (поддерживается Markdown)" />
                <Input value={s.imageUrl ?? ""} onChange={(e) => update(i, { imageUrl: e.target.value || undefined })} placeholder="Ссылка на изображение (необязательно)" />
              </div>
              <div className="flex flex-col">
                <Button type="button" variant="ghost" size="sm" onClick={() => move(i, -1)} aria-label="Выше">
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => move(i, 1)} aria-label="Ниже">
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSteps((x) => x.filter((_, j) => j !== i))} aria-label="Удалить шаг">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
        <Button type="button" variant="ghost" className="mt-2" onClick={() => setSteps((s) => [...s, { title: "", body: "" }])}>
          <Plus className="size-3.5" /> Шаг
        </Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Требования к результату" hint="Каждое с новой строки">
          <Textarea name="requirements" rows={4} defaultValue={practice?.requirements.join("\n")} />
        </Field>
        <Field label="Критерии проверки" hint="Каждый с новой строки">
          <Textarea name="criteria" rows={4} defaultValue={practice?.criteria.join("\n")} />
        </Field>
      </section>

      <Checkbox name="allowUpload" label="Студент может загрузить файлы работы" defaultChecked={practice?.allowUpload ?? true} />
      <SaveBar pending={pending} state={state} label="Сохранить задание" />
    </form>
  );
}

export function LessonHotkeysForm({
  lessonId,
  hotkeys,
  selected,
  defaultSoftware,
}: {
  lessonId: string;
  hotkeys: { id: string; action: string; keys: string; software: string }[];
  selected: string[];
  defaultSoftware: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setLessonHotkeys.bind(null, lessonId), undefined);
  const [checked, setChecked] = useState(new Set(selected));
  const [filter, setFilter] = useState(defaultSoftware);
  const [q, setQ] = useState("");
  const visible = hotkeys.filter(
    (h) => (filter === "ALL" || h.software === filter || checked.has(h.id)) && (!q || h.action.toLowerCase().includes(q.toLowerCase()) || h.keys.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <form action={action}>
      {[...checked].map((id) => (
        <input key={id} type="hidden" name="hotkeyIds" value={id} />
      ))}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40">
          <option value="ALL">Все программы</option>
          <option value="PHOTOSHOP">Photoshop</option>
          <option value="ILLUSTRATOR">Illustrator</option>
          <option value="FIGMA">Figma</option>
          <option value="GENERAL">Общие</option>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск" className="w-48" />
        <span className="ml-auto font-mono text-xs text-fg-3">выбрано {checked.size}</span>
      </div>
      <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface">
        {visible.map((h) => (
          <li key={h.id}>
            <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-muted">
              <input
                type="checkbox"
                className="size-4 accent-[var(--accent)]"
                checked={checked.has(h.id)}
                onChange={(e) =>
                  setChecked((s) => {
                    const n = new Set(s);
                    if (e.target.checked) n.add(h.id);
                    else n.delete(h.id);
                    return n;
                  })
                }
              />
              <span className="min-w-0 flex-1 truncate text-sm">{h.action}</span>
              <KeyCombo combo={h.keys} />
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-fg-3">Нужного сочетания нет? Добавьте его в разделе «Горячие клавиши».</p>
      <SaveBar pending={pending} state={state} />
    </form>
  );
}
