"use client";

import { useActionState } from "react";
import { setupFirstTeacher } from "@/lib/actions/setup";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input } from "@/components/ui/form";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupFirstTeacher, undefined);
  return (
    <form action={action} className="mt-8 space-y-4">
      <Field label="Имя и фамилия">
        <Input name="name" autoComplete="name" required autoFocus />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Пароль" hint="Минимум 8 символов">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Первая группа" hint="Студенты зарегистрируются по её коду">
        <Input name="groupName" placeholder="WEB 2-1" required />
      </Field>
      <Checkbox name="demo" label="Добавить готовый курс Web Design (12 тем Photoshop и Illustrator)" defaultChecked />
      <FormError message={state?.error} />
      <Button variant="primary" size="lg" className="w-full" disabled={pending}>
        {pending ? "Настраиваем…" : "Начать"}
      </Button>
    </form>
  );
}
