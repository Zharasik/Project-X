"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { isoToDate } from "@/lib/dates";
import { normalizeCombo } from "@/lib/hotkeys";
import { practiceStepSchema } from "@/lib/practice";
import { syncLessonProgress } from "@/lib/progress";

export type ActionState = { error?: string; ok?: boolean } | undefined;

// ─────────────────────────── Ownership guards ───────────────────────────

async function teacher() {
  const user = await requireTeacher();
  return { user, teacherId: user.teacherProfile.id };
}

async function ownCourse(courseId: string) {
  const { teacherId } = await teacher();
  const course = await db.course.findFirst({ where: { id: courseId, teacherId } });
  if (!course) throw new Error("Course not found");
  return course;
}

async function ownModule(moduleId: string) {
  const { teacherId } = await teacher();
  const mod = await db.module.findFirst({ where: { id: moduleId, course: { teacherId } } });
  if (!mod) throw new Error("Module not found");
  return mod;
}

async function ownLesson(lessonId: string) {
  const { teacherId } = await teacher();
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, module: { course: { teacherId } } },
    include: { module: true },
  });
  if (!lesson) throw new Error("Lesson not found");
  return lesson;
}

async function ownGroup(groupId: string) {
  const { teacherId } = await teacher();
  const group = await db.group.findFirst({ where: { id: groupId, teacherId } });
  if (!group) throw new Error("Group not found");
  return group;
}

function lines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

const bool = (v: FormDataEntryValue | null) => v === "on" || v === "true";
const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Проверьте поля формы";

function revalidateContent() {
  revalidatePath("/teacher", "layout");
  revalidatePath("/", "layout");
}

// ─────────────────────────── Courses ───────────────────────────

const courseSchema = z.object({
  title: z.string().trim().min(2, "Название — минимум 2 символа").max(120),
  description: z.string().trim().max(500).default(""),
});

export async function createCourse(_: ActionState, formData: FormData): Promise<ActionState> {
  const { teacherId } = await teacher();
  const parsed = courseSchema.safeParse({ title: formData.get("title"), description: formData.get("description") ?? "" });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const course = await db.course.create({ data: { ...parsed.data, teacherId } });
  revalidateContent();
  redirect(`/teacher/courses/${course.id}`);
}

export async function updateCourse(courseId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await ownCourse(courseId);
  const { teacherId } = await teacher();
  const parsed = courseSchema.safeParse({ title: formData.get("title"), description: formData.get("description") ?? "" });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const groupIds = formData.getAll("groupIds").map(String);
  const ownGroups = await db.group.findMany({ where: { id: { in: groupIds }, teacherId }, select: { id: true } });

  await db.$transaction([
    db.course.update({ where: { id: courseId }, data: { ...parsed.data, published: bool(formData.get("published")) } }),
    db.groupCourse.deleteMany({ where: { courseId } }),
    db.groupCourse.createMany({ data: ownGroups.map((g) => ({ groupId: g.id, courseId })) }),
  ]);
  revalidateContent();
  return { ok: true };
}

export async function deleteCourse(courseId: string) {
  await ownCourse(courseId);
  const planned = await db.dailyPlan.count({ where: { lesson: { module: { courseId } } } });
  if (planned > 0) throw new Error("Курс используется в плане занятий");
  await db.course.delete({ where: { id: courseId } });
  revalidateContent();
  redirect("/teacher/courses");
}

// ─────────────────────────── Modules ───────────────────────────

const moduleSchema = z.object({
  title: z.string().trim().min(1, "Введите название модуля").max(120),
  description: z.string().trim().max(500).default(""),
  software: z.enum(["PHOTOSHOP", "ILLUSTRATOR", "FIGMA", "GENERAL"]),
});

export async function createModule(courseId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await ownCourse(courseId);
  const parsed = moduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const last = await db.module.aggregate({ where: { courseId }, _max: { order: true } });
  await db.module.create({ data: { ...parsed.data, courseId, order: (last._max.order ?? -1) + 1 } });
  revalidateContent();
  return { ok: true };
}

export async function updateModule(moduleId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await ownModule(moduleId);
  const parsed = moduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.module.update({ where: { id: moduleId }, data: { ...parsed.data, published: bool(formData.get("published")) } });
  revalidateContent();
  return { ok: true };
}

export async function deleteModule(moduleId: string) {
  const mod = await ownModule(moduleId);
  const planned = await db.dailyPlan.count({ where: { lesson: { moduleId } } });
  if (planned > 0) throw new Error("Темы модуля используются в плане занятий");
  await db.module.delete({ where: { id: moduleId } });
  revalidateContent();
  revalidatePath(`/teacher/courses/${mod.courseId}`);
}

/** Swaps `order` with the neighbour in the given direction. */
async function swapOrder<T extends { id: string; order: number }>(
  items: T[],
  id: string,
  dir: "up" | "down",
  update: (id: string, order: number) => Prisma.PrismaPromise<unknown>,
) {
  const i = items.findIndex((x) => x.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= items.length) return;
  // Normalise to 0..n-1 first so duplicate orders can't block a move.
  const reordered = [...items];
  [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
  await db.$transaction(reordered.map((x, idx) => update(x.id, idx)));
}

export async function moveModule(moduleId: string, dir: "up" | "down") {
  const mod = await ownModule(moduleId);
  const siblings = await db.module.findMany({ where: { courseId: mod.courseId }, orderBy: { order: "asc" } });
  await swapOrder(siblings, moduleId, dir, (id, order) => db.module.update({ where: { id }, data: { order } }));
  revalidateContent();
}

// ─────────────────────────── Lessons ───────────────────────────

const lessonSchema = z.object({
  title: z.string().trim().min(2, "Название — минимум 2 символа").max(140),
  summary: z.string().trim().max(400).default(""),
  estimatedMinutes: z.coerce.number().int().min(5).max(600).default(80),
});

export async function createLesson(moduleId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await ownModule(moduleId);
  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary") ?? "",
    estimatedMinutes: formData.get("estimatedMinutes") || 80,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const last = await db.lesson.aggregate({ where: { moduleId }, _max: { order: true } });
  const lesson = await db.lesson.create({ data: { ...parsed.data, moduleId, order: (last._max.order ?? -1) + 1 } });
  revalidateContent();
  redirect(`/teacher/lessons/${lesson.id}`);
}

export async function updateLesson(lessonId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const lesson = await ownLesson(lessonId);
  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary") ?? "",
    estimatedMinutes: formData.get("estimatedMinutes") || 80,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  let moduleId = lesson.moduleId;
  let order = lesson.order;
  const targetModule = String(formData.get("moduleId") ?? lesson.moduleId);
  if (targetModule !== lesson.moduleId) {
    const target = await ownModule(targetModule);
    const last = await db.lesson.aggregate({ where: { moduleId: target.id }, _max: { order: true } });
    moduleId = target.id;
    order = (last._max.order ?? -1) + 1;
  }
  await db.lesson.update({
    where: { id: lessonId },
    data: { ...parsed.data, moduleId, order, published: bool(formData.get("published")) },
  });
  revalidateContent();
  return { ok: true };
}

export async function deleteLesson(lessonId: string) {
  const lesson = await ownLesson(lessonId);
  const planned = await db.dailyPlan.count({ where: { lessonId } });
  if (planned > 0) throw new Error("Тема используется в плане занятий — сначала удалите занятия");
  await db.lesson.delete({ where: { id: lessonId } });
  revalidateContent();
  redirect(`/teacher/courses/${lesson.module.courseId}`);
}

export async function moveLesson(lessonId: string, dir: "up" | "down") {
  const lesson = await ownLesson(lessonId);
  const siblings = await db.lesson.findMany({ where: { moduleId: lesson.moduleId }, orderBy: { order: "asc" } });
  await swapOrder(siblings, lessonId, dir, (id, order) => db.lesson.update({ where: { id }, data: { order } }));
  revalidateContent();
}

export async function setPublished(kind: "course" | "module" | "lesson", id: string, published: boolean) {
  if (kind === "course") {
    await ownCourse(id);
    await db.course.update({ where: { id }, data: { published } });
  } else if (kind === "module") {
    await ownModule(id);
    await db.module.update({ where: { id }, data: { published } });
  } else {
    await ownLesson(id);
    await db.lesson.update({ where: { id }, data: { published } });
  }
  revalidateContent();
}

// ─────────────────────────── Lecture ───────────────────────────

export async function saveLecture(lessonId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await ownLesson(lessonId);
  const parsed = z
    .object({ body: z.string().max(100_000), estimatedMinutes: z.coerce.number().int().min(1).max(300) })
    .safeParse({ body: formData.get("body") ?? "", estimatedMinutes: formData.get("estimatedMinutes") || 15 });
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.lecture.upsert({ where: { lessonId }, create: { lessonId, ...parsed.data }, update: parsed.data });
  revalidateContent();
  return { ok: true };
}

export async function deleteLecture(lessonId: string) {
  await ownLesson(lessonId);
  await db.lecture.deleteMany({ where: { lessonId } });
  revalidateContent();
}

// ─────────────────────────── Practice ───────────────────────────

const practiceSchema = z.object({
  title: z.string().trim().min(2, "Введите название задания").max(160),
  goal: z.string().trim().max(1000).default(""),
  estimatedMinutes: z.coerce.number().int().min(1).max(600),
  steps: z.array(practiceStepSchema),
});

export async function savePractice(lessonId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await ownLesson(lessonId);
  let steps: unknown;
  try {
    steps = JSON.parse(String(formData.get("steps") ?? "[]"));
  } catch {
    return { error: "Не удалось прочитать шаги задания" };
  }
  const parsed = practiceSchema.safeParse({
    title: formData.get("title"),
    goal: formData.get("goal") ?? "",
    estimatedMinutes: formData.get("estimatedMinutes") || 40,
    steps,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const data = {
    ...parsed.data,
    steps: parsed.data.steps.filter((s) => s.title.trim()),
    software: lines(formData.get("software")),
    requirements: lines(formData.get("requirements")),
    criteria: lines(formData.get("criteria")),
    allowUpload: bool(formData.get("allowUpload")),
  };
  await db.practice.upsert({ where: { lessonId }, create: { lessonId, ...data }, update: data });
  revalidateContent();
  return { ok: true };
}

export async function deletePractice(lessonId: string) {
  await ownLesson(lessonId);
  const subs = await db.submission.count({ where: { practice: { lessonId } } });
  if (subs > 0) throw new Error("По заданию уже есть сданные работы");
  await db.practice.deleteMany({ where: { lessonId } });
  revalidateContent();
}

// ─────────────────────────── Quiz ───────────────────────────

export async function saveQuizSettings(lessonId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await ownLesson(lessonId);
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(160),
      passingScore: z.coerce.number().int().min(1, "Проходной балл 1–100").max(100, "Проходной балл 1–100"),
    })
    .safeParse({ title: formData.get("title") || "Тест", passingScore: formData.get("passingScore") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.quiz.upsert({ where: { lessonId }, create: { lessonId, ...parsed.data }, update: parsed.data });
  revalidateContent();
  return { ok: true };
}

const questionSchema = z
  .object({
    id: z.string().optional(),
    type: z.enum(["SINGLE", "MULTIPLE", "TRUE_FALSE"]),
    text: z.string().trim().min(3, "Введите текст вопроса").max(1000),
    explanation: z.string().trim().max(1000).default(""),
    options: z
      .array(z.object({ text: z.string().trim().min(1, "Пустой вариант ответа"), isCorrect: z.boolean() }))
      .min(2, "Нужно минимум 2 варианта")
      .max(8),
  })
  .superRefine((q, ctx) => {
    const correct = q.options.filter((o) => o.isCorrect).length;
    if (correct === 0) ctx.addIssue({ code: "custom", message: "Отметьте правильный ответ" });
    if (q.type !== "MULTIPLE" && correct > 1) ctx.addIssue({ code: "custom", message: "В этом типе вопроса только один правильный ответ" });
    if (q.type === "TRUE_FALSE" && q.options.length !== 2) ctx.addIssue({ code: "custom", message: "Верно / неверно — ровно 2 варианта" });
  });

export type QuestionInput = z.input<typeof questionSchema>;

export async function saveQuestion(lessonId: string, input: QuestionInput): Promise<ActionState> {
  await ownLesson(lessonId);
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const q = parsed.data;

  const quiz =
    (await db.quiz.findUnique({ where: { lessonId } })) ?? (await db.quiz.create({ data: { lessonId, title: "Тест" } }));
  const options = q.options.map((o, order) => ({ ...o, order }));

  if (q.id) {
    const existing = await db.question.findFirst({ where: { id: q.id, quizId: quiz.id } });
    if (!existing) return { error: "Вопрос не найден" };
    await db.$transaction([
      db.questionOption.deleteMany({ where: { questionId: q.id } }),
      db.question.update({
        where: { id: q.id },
        data: { type: q.type, text: q.text, explanation: q.explanation, options: { create: options } },
      }),
    ]);
  } else {
    const last = await db.question.aggregate({ where: { quizId: quiz.id }, _max: { order: true } });
    await db.question.create({
      data: {
        quizId: quiz.id,
        type: q.type,
        text: q.text,
        explanation: q.explanation,
        order: (last._max.order ?? -1) + 1,
        options: { create: options },
      },
    });
  }
  revalidateContent();
  return { ok: true };
}

export async function deleteQuestion(lessonId: string, questionId: string) {
  await ownLesson(lessonId);
  await db.question.deleteMany({ where: { id: questionId, quiz: { lessonId } } });
  revalidateContent();
}

export async function moveQuestion(lessonId: string, questionId: string, dir: "up" | "down") {
  await ownLesson(lessonId);
  const siblings = await db.question.findMany({ where: { quiz: { lessonId } }, orderBy: { order: "asc" } });
  await swapOrder(siblings, questionId, dir, (id, order) => db.question.update({ where: { id }, data: { order } }));
  revalidateContent();
}

// ─────────────────────────── Hotkeys ───────────────────────────

const hotkeySchema = z.object({
  software: z.enum(["PHOTOSHOP", "ILLUSTRATOR", "FIGMA", "GENERAL"]),
  action: z.string().trim().min(2, "Опишите действие").max(160),
  keys: z.string().trim().min(1, "Укажите сочетание").max(40),
  macKeys: z.string().trim().max(40).optional(),
});

export async function saveHotkey(hotkeyId: string | null, _: ActionState, formData: FormData): Promise<ActionState> {
  await teacher();
  const parsed = hotkeySchema.safeParse({
    software: formData.get("software"),
    action: formData.get("action"),
    keys: formData.get("keys"),
    macKeys: formData.get("macKeys") || undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const data = {
    ...parsed.data,
    keys: normalizeCombo(parsed.data.keys),
    macKeys: parsed.data.macKeys || null,
    published: hotkeyId ? bool(formData.get("published")) : true,
  };
  const clash = await db.hotkey.findFirst({
    where: { software: data.software, keys: data.keys, ...(hotkeyId ? { NOT: { id: hotkeyId } } : {}) },
  });
  if (clash) return { error: `Сочетание ${data.keys} уже есть: «${clash.action}»` };
  if (hotkeyId) await db.hotkey.update({ where: { id: hotkeyId }, data });
  else await db.hotkey.create({ data });
  revalidateContent();
  return { ok: true };
}

export async function deleteHotkey(hotkeyId: string) {
  await teacher();
  await db.hotkey.delete({ where: { id: hotkeyId } });
  revalidateContent();
}

export async function setLessonHotkeys(lessonId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await ownLesson(lessonId);
  const ids = formData.getAll("hotkeyIds").map(String);
  const valid = await db.hotkey.findMany({ where: { id: { in: ids } }, select: { id: true } });
  await db.$transaction([
    db.lessonHotkey.deleteMany({ where: { lessonId } }),
    db.lessonHotkey.createMany({ data: valid.map((h, order) => ({ lessonId, hotkeyId: h.id, order })) }),
  ]);
  revalidateContent();
  return { ok: true };
}

// ─────────────────────────── Groups ───────────────────────────

function inviteCode(name: string) {
  const prefix = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 5) || "GROUP";
  return `${prefix}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createGroup(_: ActionState, formData: FormData): Promise<ActionState> {
  const { teacherId } = await teacher();
  const parsed = z.string().trim().min(2, "Введите название группы").max(40).safeParse(formData.get("name"));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const group = await db.group.create({ data: { name: parsed.data, inviteCode: inviteCode(parsed.data), teacherId } });
  revalidatePath("/teacher", "layout");
  redirect(`/teacher/groups/${group.id}`);
}

export async function regenerateInviteCode(groupId: string) {
  const group = await ownGroup(groupId);
  await db.group.update({ where: { id: groupId }, data: { inviteCode: inviteCode(group.name) } });
  revalidatePath(`/teacher/groups/${groupId}`);
}

// ─────────────────────────── Daily plans ───────────────────────────

const planSchema = z.object({
  groupId: z.string().min(1, "Выберите группу"),
  lessonId: z.string().min(1, "Выберите тему"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату"),
  number: z.coerce.number().int().min(1).max(999).optional(),
  teacherNotes: z.string().max(4000).default(""),
  items: z
    .array(
      z.object({
        start: z.string().regex(/^\d{2}:\d{2}$/, "Время в формате ЧЧ:ММ"),
        end: z.string().regex(/^\d{2}:\d{2}$/, "Время в формате ЧЧ:ММ"),
        title: z.string().trim().min(1, "Заполните пункт плана").max(120),
      }),
    )
    .max(20),
});

export async function savePlan(planId: string | null, _: ActionState, formData: FormData): Promise<ActionState> {
  const { teacherId } = await teacher();
  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Не удалось прочитать план" };
  }
  const parsed = planSchema.safeParse({
    groupId: formData.get("groupId"),
    lessonId: formData.get("lessonId"),
    date: formData.get("date"),
    number: formData.get("number") || undefined,
    teacherNotes: formData.get("teacherNotes") ?? "",
    items,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const p = parsed.data;

  await ownGroup(p.groupId);
  await ownLesson(p.lessonId);
  if (planId) {
    const existing = await db.dailyPlan.findFirst({ where: { id: planId, group: { teacherId } } });
    if (!existing) return { error: "Занятие не найдено" };
  }

  const data = {
    groupId: p.groupId,
    lessonId: p.lessonId,
    date: isoToDate(p.date),
    number: p.number ?? null,
    teacherNotes: p.teacherNotes,
  };
  const itemRows = p.items.map((it, order) => ({ ...it, order }));

  const plan = planId
    ? await db.$transaction(async (tx) => {
        await tx.dailyPlanItem.deleteMany({ where: { planId } });
        return tx.dailyPlan.update({ where: { id: planId }, data: { ...data, items: { create: itemRows } } });
      })
    : await db.dailyPlan.create({ data: { ...data, items: { create: itemRows } } });

  revalidatePath("/teacher", "layout");
  revalidatePath("/", "layout");
  redirect(`/teacher/plans?date=${p.date}#${plan.id}`);
}

export async function deletePlan(planId: string) {
  const { teacherId } = await teacher();
  await db.dailyPlan.deleteMany({ where: { id: planId, group: { teacherId } } });
  revalidatePath("/teacher", "layout");
  revalidatePath("/", "layout");
  redirect("/teacher/plans");
}

// ─────────────────────────── Submissions ───────────────────────────

export async function reviewSubmission(submissionId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { user, teacherId } = await teacher();
  const status = z.enum(["ACCEPTED", "NEEDS_REVISION"]).safeParse(formData.get("status"));
  if (!status.success) return { error: "Выберите решение" };
  const feedback = String(formData.get("feedback") ?? "").trim().slice(0, 2000);
  if (status.data === "NEEDS_REVISION" && !feedback) return { error: "Напишите, что нужно исправить" };

  const sub = await db.submission.findFirst({
    where: { id: submissionId, student: { studentProfile: { group: { teacherId } } } },
    include: { practice: { select: { lessonId: true } } },
  });
  if (!sub) return { error: "Работа не найдена" };

  await db.submission.update({
    where: { id: submissionId },
    data: { status: status.data, feedback, reviewerId: user.id, reviewedAt: new Date() },
  });
  // Returning work for revision reopens the student's lesson.
  await syncLessonProgress(sub.studentId, sub.practice.lessonId);
  revalidatePath("/teacher", "layout");
  return { ok: true };
}
