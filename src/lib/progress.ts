import "server-only";
import { db } from "@/lib/db";

/**
 * The single place where lesson / course progress is derived.
 *
 * Facts come from:
 *   lecture  → LessonProgress.lectureReadAt
 *   practice → Submission (status ≠ NEEDS_REVISION)
 *   quiz     → LessonProgress.quizPassedAt / quizBestPercent
 *   hotkeys  → HotkeyStat.correct ≥ 1 for every hotkey of the lesson
 */

export type StepKey = "lecture" | "practice" | "quiz" | "hotkeys";
export type StepState = "todo" | "in_progress" | "done";
export type LessonStatus = "not_started" | "in_progress" | "completed";

export interface StepInfo {
  key: StepKey;
  state: StepState;
  href: string;
}

export interface LessonState {
  lessonId: string;
  status: LessonStatus;
  steps: StepInfo[];
  done: number;
  total: number;
  /** First unfinished step, or null when everything is done */
  next: StepInfo | null;
  /** Every step is done; the lesson becomes "completed" once the student confirms it */
  allStepsDone: boolean;
  completedAt: Date | null;
}

export const STEP_ORDER: StepKey[] = ["lecture", "practice", "quiz", "hotkeys"];

export function stepHref(lessonId: string, key: StepKey) {
  return key === "hotkeys" ? `/hotkeys?lesson=${lessonId}` : `/lessons/${lessonId}/${key}`;
}

const lessonShape = {
  id: true,
  lecture: { select: { id: true } },
  practice: { select: { id: true } },
  quiz: { select: { id: true, _count: { select: { questions: true } } } },
  hotkeys: { select: { hotkeyId: true }, where: { hotkey: { published: true } } },
} as const;

export async function getLessonStates(userId: string, lessonIds: string[]): Promise<Map<string, LessonState>> {
  const result = new Map<string, LessonState>();
  if (lessonIds.length === 0) return result;

  const lessons = await db.lesson.findMany({ where: { id: { in: lessonIds } }, select: lessonShape });
  const practiceIds = lessons.flatMap((l) => (l.practice ? [l.practice.id] : []));
  const hotkeyIds = [...new Set(lessons.flatMap((l) => l.hotkeys.map((h) => h.hotkeyId)))];

  const [progressRows, submissions, stats] = await Promise.all([
    db.lessonProgress.findMany({ where: { userId, lessonId: { in: lessonIds } } }),
    practiceIds.length
      ? db.submission.findMany({
          where: { studentId: userId, practiceId: { in: practiceIds } },
          select: { practiceId: true, status: true },
        })
      : [],
    hotkeyIds.length
      ? db.hotkeyStat.findMany({
          where: { userId, hotkeyId: { in: hotkeyIds } },
          select: { hotkeyId: true, correct: true },
        })
      : [],
  ]);

  const progressByLesson = new Map(progressRows.map((p) => [p.lessonId, p]));
  const submissionByPractice = new Map(submissions.map((s) => [s.practiceId, s]));
  const learnedHotkeys = new Set(stats.filter((s) => s.correct > 0).map((s) => s.hotkeyId));

  for (const lesson of lessons) {
    const p = progressByLesson.get(lesson.id);
    const steps: StepInfo[] = [];

    if (lesson.lecture) {
      steps.push({ key: "lecture", state: p?.lectureReadAt ? "done" : "todo", href: stepHref(lesson.id, "lecture") });
    }
    if (lesson.practice) {
      const s = submissionByPractice.get(lesson.practice.id);
      const state: StepState = !s ? "todo" : s.status === "NEEDS_REVISION" ? "in_progress" : "done";
      steps.push({ key: "practice", state, href: stepHref(lesson.id, "practice") });
    }
    if (lesson.quiz && lesson.quiz._count.questions > 0) {
      const state: StepState = p?.quizPassedAt ? "done" : p?.quizBestPercent != null ? "in_progress" : "todo";
      steps.push({ key: "quiz", state, href: stepHref(lesson.id, "quiz") });
    }
    if (lesson.hotkeys.length > 0) {
      const learned = lesson.hotkeys.filter((h) => learnedHotkeys.has(h.hotkeyId)).length;
      const state: StepState = learned === lesson.hotkeys.length ? "done" : learned > 0 ? "in_progress" : "todo";
      steps.push({ key: "hotkeys", state, href: stepHref(lesson.id, "hotkeys") });
    }

    const done = steps.filter((s) => s.state === "done").length;
    const total = steps.length;
    // A shared hotkey learned elsewhere shouldn't mark an unopened lesson as started.
    const touched = !!p || steps.some((s) => s.key !== "hotkeys" && s.state !== "todo");
    const allStepsDone = total > 0 && done === total;
    const status: LessonStatus =
      allStepsDone && p?.completedAt ? "completed" : touched ? "in_progress" : "not_started";

    result.set(lesson.id, {
      lessonId: lesson.id,
      status,
      steps,
      done,
      total,
      next: steps.find((s) => s.state !== "done") ?? null,
      allStepsDone,
      completedAt: p?.completedAt ?? null,
    });
  }

  return result;
}

export async function getLessonState(userId: string, lessonId: string) {
  return (await getLessonStates(userId, [lessonId])).get(lessonId) ?? null;
}

/**
 * Called after any action that changes a step's facts. Ensures the lesson has
 * a progress row and clears `completedAt` if the lesson is no longer complete
 * (e.g. practice returned for revision). `completedAt` itself is only set by
 * the explicit "Завершить тему" action after the server re-checks every step.
 */
export async function syncLessonProgress(userId: string, lessonId: string) {
  const state = await getLessonState(userId, lessonId);
  if (!state) return null;
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId },
    update: state.allStepsDone ? {} : { completedAt: null },
  });
  return state;
}

export async function markLessonFinished(userId: string, lessonId: string) {
  await db.lessonProgress.update({
    where: { userId_lessonId: { userId, lessonId } },
    data: { completedAt: new Date() },
  });
}

/** Marks a lesson as opened so it shows up as "in progress". */
export async function touchLesson(userId: string, lessonId: string) {
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId },
    update: {},
  });
}

// ─────────────────────────── Course level ───────────────────────────

/** Published course outline visible to students, in order. */
export async function getCourseOutline(courseId: string) {
  return db.course.findFirst({
    where: { id: courseId, published: true },
    include: {
      modules: {
        where: { published: true },
        orderBy: { order: "asc" },
        include: {
          lessons: {
            where: { published: true },
            orderBy: { order: "asc" },
            include: {
              lecture: { select: { estimatedMinutes: true } },
              practice: { select: { estimatedMinutes: true } },
              quiz: { select: { _count: { select: { questions: true } } } },
              _count: { select: { hotkeys: true } },
            },
          },
        },
      },
    },
  });
}

export type CourseOutline = NonNullable<Awaited<ReturnType<typeof getCourseOutline>>>;
export type OutlineLesson = CourseOutline["modules"][number]["lessons"][number];

export function flattenLessons(outline: CourseOutline) {
  return outline.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, module: m })));
}

export interface CourseProgress {
  percent: number;
  completed: number;
  total: number;
  inProgress: number;
  states: Map<string, LessonState>;
  /** First lesson that isn't completed, in course order */
  current: (OutlineLesson & { module: CourseOutline["modules"][number] }) | null;
}

export async function getCourseProgress(userId: string, outline: CourseOutline): Promise<CourseProgress> {
  const lessons = flattenLessons(outline);
  const states = await getLessonStates(userId, lessons.map((l) => l.id));
  const completed = lessons.filter((l) => states.get(l.id)?.status === "completed").length;
  const inProgress = lessons.filter((l) => states.get(l.id)?.status === "in_progress").length;
  const current =
    lessons.find((l) => states.get(l.id)?.status === "in_progress") ??
    lessons.find((l) => states.get(l.id)?.status !== "completed") ??
    null;
  return {
    percent: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
    completed,
    total: lessons.length,
    inProgress,
    states,
    current,
  };
}

// ─────────────────────────── Access ───────────────────────────

/** Courses assigned to the student's group. */
export async function getStudentCourses(groupId: string) {
  return db.course.findMany({
    where: { published: true, groups: { some: { groupId } } },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, description: true },
  });
}

/** Loads a lesson only if the student's group can see it. */
export async function getAccessibleLesson(groupId: string, lessonId: string) {
  return db.lesson.findFirst({
    where: {
      id: lessonId,
      published: true,
      module: { published: true, course: { published: true, groups: { some: { groupId } } } },
    },
    include: {
      module: { include: { course: { select: { id: true, title: true } } } },
      lecture: true,
      practice: true,
      quiz: { include: { _count: { select: { questions: true } } } },
      hotkeys: {
        where: { hotkey: { published: true } },
        orderBy: { order: "asc" },
        include: { hotkey: true },
      },
    },
  });
}

export type AccessibleLesson = NonNullable<Awaited<ReturnType<typeof getAccessibleLesson>>>;

/** Previous / next published lesson in the course order. */
export async function getNeighbours(courseId: string, lessonId: string) {
  const outline = await getCourseOutline(courseId);
  if (!outline) return { prev: null, next: null, index: -1, total: 0 };
  const flat = flattenLessons(outline);
  const index = flat.findIndex((l) => l.id === lessonId);
  return {
    prev: index > 0 ? flat[index - 1] : null,
    next: index >= 0 && index < flat.length - 1 ? flat[index + 1] : null,
    index,
    total: flat.length,
  };
}
