"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { createDemoContent } from "../../../prisma/demo-content";

export type SetupState = { error?: string } | undefined;

/** First-run setup is only available while the database has no teacher. */
export async function isSetupDone() {
  return (await db.user.count({ where: { role: { in: ["TEACHER", "ADMIN"] } } })) > 0;
}

const schema = z.object({
  name: z.string().trim().min(2, "Введите имя").max(80),
  email: z.string().trim().toLowerCase().email("Введите корректный email"),
  password: z.string().min(8, "Пароль — минимум 8 символов"),
  groupName: z.string().trim().min(2, "Введите название группы").max(40),
  demo: z.boolean(),
});

export async function setupFirstTeacher(_: SetupState, formData: FormData): Promise<SetupState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    groupName: formData.get("groupName"),
    demo: formData.get("demo") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password, groupName, demo } = parsed.data;

  if (await isSetupDone()) return { error: "Платформа уже настроена. Войдите как преподаватель." };
  if (await db.user.findUnique({ where: { email } })) return { error: "Этот email уже зарегистрирован" };

  const teacher = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "TEACHER",
      teacherProfile: { create: {} },
    },
    include: { teacherProfile: true },
  });
  const teacherId = teacher.teacherProfile!.id;

  const prefix = groupName.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 5) || "GROUP";
  const group = await db.group.create({
    data: { name: groupName, inviteCode: `${prefix}-${randomBytes(3).toString("hex").toUpperCase()}`, teacherId },
  });

  if (demo) {
    const { courseId } = await createDemoContent(db, teacherId);
    await db.groupCourse.create({ data: { groupId: group.id, courseId } });
  }

  await createSession(teacher.id, teacher.role);
  redirect(`/teacher/groups/${group.id}`);
}
