"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FavoriteKind } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { getAccessibleLesson, getLessonState, getNeighbours, markLessonFinished, syncLessonProgress } from "@/lib/progress";
import { gradeAnswers, type QuizResult } from "@/lib/quiz";
import { extensionOf, storage, storageMode } from "@/lib/storage";
import { submissionPrefix, uploadError } from "@/lib/uploads";

async function lessonForStudent(lessonId: string) {
  const user = await requireStudent();
  const lesson = await getAccessibleLesson(user.studentProfile.groupId, lessonId);
  if (!lesson) throw new Error("Lesson not found");
  return { user, lesson };
}

function revalidateLesson(lessonId: string) {
  revalidatePath(`/lessons/${lessonId}`, "layout");
  revalidatePath("/");
}

// ─────────────────────────── Lecture ───────────────────────────

export async function markLectureRead(lessonId: string) {
  const { user, lesson } = await lessonForStudent(lessonId);
  if (!lesson.lecture) return;
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    create: { userId: user.id, lessonId, lectureReadAt: new Date() },
    update: { lectureReadAt: new Date() },
  });
  await syncLessonProgress(user.id, lessonId);
  revalidateLesson(lessonId);
}

// ─────────────────────────── Practice ───────────────────────────

export type SubmitState = { error?: string; ok?: boolean } | undefined;

const submissionSchema = z.object({
  lessonId: z.string().min(1),
  comment: z.string().trim().max(2000).default(""),
  link: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "Ссылка должна начинаться с http:// или https://")
    .default(""),
});

export async function submitPractice(_: SubmitState, formData: FormData): Promise<SubmitState> {
  const parsed = submissionSchema.safeParse({
    lessonId: formData.get("lessonId"),
    comment: formData.get("comment") ?? "",
    link: formData.get("link") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { user, lesson } = await lessonForStudent(parsed.data.lessonId);
  const practice = lesson.practice;
  if (!practice) return { error: "У темы нет практического задания" };

  // Local storage: files arrive in the form. Blob storage: the browser already
  // uploaded them under the student's prefix and sends their keys.
  const files = practice.allowUpload
    ? formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0)
    : [];
  for (const f of files) {
    const err = uploadError(f);
    if (err) return { error: err };
  }

  const uploaded: { key: string; name: string; size: number; contentType: string }[] = [];
  if (practice.allowUpload && storageMode === "blob") {
    let raw: unknown = [];
    try {
      raw = JSON.parse(String(formData.get("uploaded") ?? "[]"));
    } catch {
      return { error: "Не удалось прочитать загруженные файлы" };
    }
    const parsedUploads = z
      .array(z.object({ key: z.string().max(500), name: z.string().max(200) }))
      .max(20)
      .safeParse(raw);
    if (!parsedUploads.success) return { error: "Не удалось прочитать загруженные файлы" };
    for (const u of parsedUploads.data) {
      if (!u.key.startsWith(submissionPrefix(user.id)) || u.key.includes("..")) return { error: "Недопустимый файл" };
      const st = await storage.stat(u.key);
      if (!st) return { error: `Файл «${u.name}» не загрузился, попробуйте ещё раз` };
      const err = uploadError({ name: u.name, size: st.size });
      if (err) {
        await storage.delete(u.key);
        return { error: err };
      }
      uploaded.push({ key: u.key, name: u.name, size: st.size, contentType: st.contentType });
    }
  }

  const submission = await db.submission.upsert({
    where: { practiceId_studentId: { practiceId: practice.id, studentId: user.id } },
    create: {
      practiceId: practice.id,
      studentId: user.id,
      comment: parsed.data.comment,
      link: parsed.data.link || null,
    },
    update: {
      status: "SUBMITTED",
      comment: parsed.data.comment,
      link: parsed.data.link || null,
      submittedAt: new Date(),
      reviewedAt: null,
    },
  });

  for (const u of uploaded) {
    await db.submissionFile.upsert({
      where: { storageKey: u.key },
      create: { submissionId: submission.id, storageKey: u.key, fileName: u.name, mimeType: u.contentType, size: u.size },
      update: {},
    });
  }

  for (const f of files) {
    const key = `${submissionPrefix(user.id)}${randomUUID()}.${extensionOf(f.name)}`;
    await storage.put(key, Buffer.from(await f.arrayBuffer()), f.type || "application/octet-stream");
    await db.submissionFile.create({
      data: {
        submissionId: submission.id,
        storageKey: key,
        fileName: f.name.slice(0, 200),
        mimeType: f.type || "application/octet-stream",
        size: f.size,
      },
    });
  }

  await syncLessonProgress(user.id, lesson.id);
  revalidateLesson(lesson.id);
  return { ok: true };
}

export async function deleteSubmissionFile(fileId: string) {
  const user = await requireStudent();
  const file = await db.submissionFile.findFirst({
    where: { id: fileId, submission: { studentId: user.id } },
    include: { submission: { include: { practice: { select: { lessonId: true } } } } },
  });
  if (!file) return;
  await storage.delete(file.storageKey);
  await db.submissionFile.delete({ where: { id: file.id } });
  revalidateLesson(file.submission.practice.lessonId);
}

// ─────────────────────────── Quiz ───────────────────────────

const answersSchema = z.record(z.string(), z.array(z.string()));

export async function submitLessonQuiz(lessonId: string, rawAnswers: unknown): Promise<QuizResult> {
  const { user, lesson } = await lessonForStudent(lessonId);
  if (!lesson.quiz) throw new Error("No quiz");
  const answers = answersSchema.parse(rawAnswers);

  const questions = await db.question.findMany({
    where: { quizId: lesson.quiz.id },
    orderBy: { order: "asc" },
    include: { options: { orderBy: { order: "asc" } } },
  });
  const result = gradeAnswers(questions, answers, lesson.quiz.passingScore);

  await db.quizAttempt.create({
    data: {
      userId: user.id,
      quizId: lesson.quiz.id,
      mode: "LESSON",
      correct: result.correct,
      total: result.total,
      percent: result.percent,
      passed: result.passed,
      answers,
    },
  });

  const prev = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId } } });
  const best = Math.max(prev?.quizBestPercent ?? 0, result.percent);
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    create: { userId: user.id, lessonId, quizBestPercent: best, quizPassedAt: result.passed ? new Date() : null },
    update: { quizBestPercent: best, ...(result.passed && !prev?.quizPassedAt ? { quizPassedAt: new Date() } : {}) },
  });
  await syncLessonProgress(user.id, lessonId);
  revalidateLesson(lessonId);
  return result;
}

/** Grades a quick quiz built from random questions the student has access to. */
export async function submitQuickQuiz(questionIds: string[], rawAnswers: unknown): Promise<QuizResult> {
  const user = await requireStudent();
  const answers = answersSchema.parse(rawAnswers);
  const ids = z.array(z.string()).max(20).parse(questionIds);

  const questions = await db.question.findMany({
    where: {
      id: { in: ids },
      quiz: {
        lesson: {
          published: true,
          module: {
            published: true,
            course: { published: true, groups: { some: { groupId: user.studentProfile.groupId } } },
          },
        },
      },
    },
    include: { options: { orderBy: { order: "asc" } } },
  });
  questions.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  const result = gradeAnswers(questions, answers, 70);

  await db.quizAttempt.create({
    data: {
      userId: user.id,
      mode: "QUICK",
      correct: result.correct,
      total: result.total,
      percent: result.percent,
      passed: result.passed,
      answers,
    },
  });
  return result;
}

// ─────────────────────────── Hotkeys ───────────────────────────

export async function recordHotkeyAnswer(hotkeyId: string, correct: boolean) {
  const user = await requireStudent();
  const hotkey = await db.hotkey.findFirst({ where: { id: hotkeyId, published: true }, select: { id: true } });
  if (!hotkey) return;
  await db.hotkeyStat.upsert({
    where: { userId_hotkeyId: { userId: user.id, hotkeyId } },
    create: { userId: user.id, hotkeyId, attempts: 1, correct: correct ? 1 : 0 },
    update: { attempts: { increment: 1 }, ...(correct ? { correct: { increment: 1 } } : {}) },
  });

  if (correct) {
    // A correct answer may complete the "hotkeys" step of lessons that use this hotkey.
    const lessons = await db.lessonHotkey.findMany({ where: { hotkeyId }, select: { lessonId: true } });
    const started = await db.lessonProgress.findMany({
      where: { userId: user.id, lessonId: { in: lessons.map((l) => l.lessonId) } },
      select: { lessonId: true },
    });
    for (const { lessonId } of started) await syncLessonProgress(user.id, lessonId);
  }
}

/** Called when the trainer is opened for a lesson so the lesson counts as started. */
export async function startLessonHotkeys(lessonId: string) {
  const { user } = await lessonForStudent(lessonId);
  await syncLessonProgress(user.id, lessonId);
}

// ─────────────────────────── Favorites ───────────────────────────

const favoriteSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.enum(["LESSON", "LECTURE", "PRACTICE"]), lessonId: z.string().min(1) }),
  z.object({ kind: z.literal("HOTKEY"), hotkeyId: z.string().min(1) }),
]);

export async function toggleFavorite(input: { kind: FavoriteKind; lessonId?: string; hotkeyId?: string }) {
  const user = await requireStudent();
  const data = favoriteSchema.parse(input);

  if (data.kind === "HOTKEY") {
    const where = { userId: user.id, kind: data.kind, hotkeyId: data.hotkeyId };
    const existing = await db.favorite.findFirst({ where });
    if (existing) await db.favorite.delete({ where: { id: existing.id } });
    else await db.favorite.create({ data: where });
  } else {
    if (!(await getAccessibleLesson(user.studentProfile.groupId, data.lessonId))) return;
    const where = { userId: user.id, kind: data.kind, lessonId: data.lessonId };
    const existing = await db.favorite.findFirst({ where });
    if (existing) await db.favorite.delete({ where: { id: existing.id } });
    else await db.favorite.create({ data: where });
  }
  revalidatePath("/", "layout");
}

// ─────────────────────────── Lesson completion ───────────────────────────

export type FinishState = { error?: string } | undefined;

/**
 * "Завершить тему" never marks anything done by itself — it re-checks the real
 * step facts and only then moves the student on.
 */
export async function finishLesson(_: FinishState, formData: FormData): Promise<FinishState> {
  const lessonId = String(formData.get("lessonId") ?? "");
  const { user, lesson } = await lessonForStudent(lessonId);
  const state = await getLessonState(user.id, lessonId);
  if (!state || !state.allStepsDone) {
    const left = state?.steps.filter((s) => s.state !== "done").length ?? 0;
    return { error: `Осталось выполнить шагов: ${left}` };
  }
  await syncLessonProgress(user.id, lessonId);
  await markLessonFinished(user.id, lessonId);
  const { next } = await getNeighbours(lesson.module.course.id, lessonId);
  revalidateLesson(lessonId);
  redirect(next ? `/lessons/${next.id}` : `/courses/${lesson.module.course.id}`);
}
