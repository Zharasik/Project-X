"use client";

import { useActionState } from "react";
import { register } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, undefined);
  return (
    <form action={action} className="mt-8 space-y-4">
      <Field label="Код группы">
        <Input name="inviteCode" required autoFocus className="font-mono uppercase" placeholder="WEB21-XXXX" />
      </Field>
      <Field label="Имя и фамилия">
        <Input name="name" autoComplete="name" required />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Пароль" hint="Минимум 8 символов">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <FormError message={state?.error} />
      <Button variant="primary" size="lg" className="w-full" disabled={pending}>
        {pending ? "Создаём…" : "Создать аккаунт"}
      </Button>
    </form>
  );
}
