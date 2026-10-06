"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { homeForRole } from "@/lib/auth/session";

export type FormState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
  next: z.string().optional(),
});

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "Неверный email или пароль" };
  }
  await createSession(user.id, user.role);
  const next = safeNext(parsed.data.next);
  const isTeacherPath = next?.startsWith("/teacher") ?? false;
  redirect(next && isTeacherPath === (user.role !== "STUDENT") ? next : homeForRole(user.role));
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Введите имя и фамилию").max(80),
  email: z.string().trim().toLowerCase().email("Введите корректный email"),
  password: z.string().min(8, "Пароль — минимум 8 символов"),
  inviteCode: z.string().trim().toUpperCase().min(4, "Введите код группы"),
});

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password, inviteCode } = parsed.data;

  const group = await db.group.findUnique({ where: { inviteCode } });
  if (!group) return { error: "Группа с таким кодом не найдена. Уточните код у преподавателя." };
  if (await db.user.findUnique({ where: { email } })) return { error: "Этот email уже зарегистрирован" };

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "STUDENT",
      studentProfile: { create: { groupId: group.id } },
    },
  });
  await createSession(user.id, user.role);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
