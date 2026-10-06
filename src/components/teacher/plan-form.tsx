"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { savePlan, type ActionState } from "@/lib/actions/teacher";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Panel } from "@/components/ui/misc";
import { SaveBar } from "./save-bar";

type Item = { start: string; end: string; title: string };

const TEMPLATE: Item[] = [
  { start: "09:00", end: "09:15", title: "Теория" },
  { start: "09:15", end: "09:30", title: "Демонстрация" },
  { start: "09:30", end: "10:10", title: "Практика" },
  { start: "10:10", end: "10:20", title: "Тест" },
];

function addMinutes(t: string, m: number) {
  const [h, mm] = t.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + mm + m);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function PlanForm({
  plan,
  groups,
  courses,
  defaults,
}: {
  plan?: { id: string; groupId: string; lessonId: string; date: string; number: number | null; teacherNotes: string; items: Item[] };
  groups: { id: string; name: string }[];
  courses: { id: string; title: string; modules: { id: string; title: string; lessons: { id: string; title: string }[] }[] }[];
  defaults: { date: string; lessonId?: string; groupId?: string; number?: number };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(savePlan.bind(null, plan?.id ?? null), undefined);
  const [items, setItems] = useState<Item[]>(plan?.items ?? TEMPLATE);
  const update = (i: number, patch: Partial<Item>) => setItems((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <Panel className="space-y-4 p-5">
        <h2 className="text-sm font-semibold">Занятие</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Дата">
            <Input name="date" type="date" defaultValue={plan?.date ?? defaults.date} required />
          </Field>
          <Field label="Группа">
            <Select name="groupId" defaultValue={plan?.groupId ?? defaults.groupId} required>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Тема">
          <Select name="lessonId" defaultValue={plan?.lessonId ?? defaults.lessonId} required>
            <option value="">— выберите тему —</option>
            {courses.map((c) =>
              c.modules.map((m) => (
                <optgroup key={m.id} label={`${c.title} · ${m.title}`}>
                  {m.lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </optgroup>
              )),
            )}
          </Select>
        </Field>
        <Field label="Номер занятия" hint="Показывается студенту: «Занятие 4»" className="sm:w-40">
          <Input name="number" type="number" min={1} defaultValue={plan?.number ?? defaults.number} />
        </Field>
        <Field label="Заметки для себя" hint="Студенты их не видят">
          <Textarea name="teacherNotes" rows={4} defaultValue={plan?.teacherNotes} />
        </Field>
      </Panel>

      <div className="space-y-4">
        <Panel className="p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Тайминг</h2>
            <span className="text-xs text-fg-3">видит только преподаватель</span>
          </div>
          <ol className="mt-3 space-y-2">
            {items.map((it, i) => (
              <li key={i} className="grid grid-cols-[96px_96px_minmax(0,1fr)_auto] items-center gap-2">
                <Input type="time" value={it.start} onChange={(e) => update(i, { start: e.target.value })} aria-label="Начало" className="px-1.5 font-mono text-sm" />
                <Input type="time" value={it.end} onChange={(e) => update(i, { end: e.target.value })} aria-label="Конец" className="px-1.5 font-mono text-sm" />
                <Input value={it.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Что делаем" />
                <Button type="button" variant="ghost" size="sm" onClick={() => setItems((s) => s.filter((_, j) => j !== i))} aria-label="Удалить пункт">
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ol>
          <Button
            type="button"
            variant="ghost"
            className="mt-2"
            onClick={() =>
              setItems((s) => {
                const start = s.length ? s[s.length - 1].end : "09:00";
                return [...s, { start, end: addMinutes(start, 15), title: "" }];
              })
            }
          >
            <Plus className="size-3.5" /> Пункт
          </Button>
        </Panel>
        <SaveBar pending={pending} state={state} label={plan ? "Сохранить занятие" : "Создать занятие"} />
      </div>
    </form>
  );
}
