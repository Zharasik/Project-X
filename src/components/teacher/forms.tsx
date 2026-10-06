"use client";

import { useActionState } from "react";
import type { Software } from "@prisma/client";
import {
  createCourse,
  createGroup,
  createLesson,
  createModule,
  updateCourse,
  updateModule,
  type ActionState,
} from "@/lib/actions/teacher";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { SaveBar } from "./save-bar";
import { useCloseDisclosure } from "./disclosure";

export const SOFTWARE_OPTIONS: { value: Software; label: string }[] = [
  { value: "PHOTOSHOP", label: "Photoshop" },
  { value: "ILLUSTRATOR", label: "Illustrator" },
  { value: "FIGMA", label: "Figma" },
  { value: "GENERAL", label: "Общее" },
];

export function CreateCourseForm() {
  const [state, action, pending] = useActionState(createCourse, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Название курса">
        <Input name="title" required placeholder="Web Design" />
      </Field>
      <Field label="Описание">
        <Textarea name="description" rows={2} />
      </Field>
      <SaveBar pending={pending} state={state} label="Создать курс" />
    </form>
  );
}

export function CourseSettingsForm({
  course,
  groups,
}: {
  course: { id: string; title: string; description: string; published: boolean; groupIds: string[] };
  groups: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateCourse.bind(null, course.id), undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Название">
        <Input name="title" defaultValue={course.title} required />
      </Field>
      <Field label="Описание">
        <Textarea name="description" rows={3} defaultValue={course.description} />
      </Field>
      <div>
        <span className="mb-2 block text-sm font-medium">Группы, которые видят курс</span>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {groups.map((g) => (
            <Checkbox key={g.id} name="groupIds" value={g.id} label={g.name} defaultChecked={course.groupIds.includes(g.id)} />
          ))}
          {groups.length === 0 && <span className="text-sm text-fg-3">Сначала создайте группу</span>}
        </div>
      </div>
      <Checkbox name="published" label="Курс опубликован" defaultChecked={course.published} />
      <SaveBar pending={pending} state={state} />
    </form>
  );
}

export function ModuleForm({
  courseId,
  module,
}: {
  courseId: string;
  module?: { id: string; title: string; description: string; software: Software; published: boolean };
}) {
  const close = useCloseDisclosure();
  const bound = module ? updateModule.bind(null, module.id) : createModule.bind(null, courseId);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await bound(prev, fd);
    if (r?.ok && !module) close();
    return r;
  }, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <Field label="Название модуля">
          <Input name="title" defaultValue={module?.title} required placeholder="Photoshop" />
        </Field>
        <Field label="Программа">
          <Select name="software" defaultValue={module?.software ?? "PHOTOSHOP"}>
            {SOFTWARE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Описание">
        <Input name="description" defaultValue={module?.description} />
      </Field>
      {module && <Checkbox name="published" label="Опубликован" defaultChecked={module.published} />}
      <SaveBar pending={pending} state={state} label={module ? "Сохранить" : "Добавить модуль"} />
    </form>
  );
}

export function CreateLessonForm({ moduleId }: { moduleId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createLesson.bind(null, moduleId), undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <Field label="Название темы">
          <Input name="title" required placeholder="Смарт-фильтры" />
        </Field>
        <Field label="Минут">
          <Input name="estimatedMinutes" type="number" min={5} defaultValue={80} />
        </Field>
      </div>
      <Field label="Краткое описание">
        <Input name="summary" />
      </Field>
      <SaveBar pending={pending} state={state} label="Создать тему" />
    </form>
  );
}

export function CreateGroupForm() {
  const [state, action, pending] = useActionState(createGroup, undefined);
  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <Input name="name" placeholder="WEB 2-2" required className="sm:max-w-56" />
      <SaveBar pending={pending} state={state} label="Создать группу" className="[&>div]:mt-0" />
    </form>
  );
}
