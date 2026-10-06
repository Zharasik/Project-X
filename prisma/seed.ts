/* Full demo: content + a group of 18 students with realistic progress and a schedule around today. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createDemoContent } from "./demo-content";

const db = new PrismaClient();

const TZ = process.env.APP_TIMEZONE ?? "Asia/Almaty";
function dayISO(offset: number) {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

const FIRST_NAMES = ["Алия", "Данияр", "Мария", "Арман", "Айгерим", "Тимур", "Камила", "Ерлан", "София", "Нурсултан", "Дана", "Илья", "Асель", "Руслан", "Жанна", "Максим", "Аружан", "Бекзат"];
const LAST_NAMES = ["Ахметова", "Касымов", "Иванова", "Сериков", "Нурланова", "Ким", "Абенова", "Жумабаев", "Петрова", "Оспанов", "Тулегенова", "Смирнов", "Бекова", "Алиев", "Омарова", "Ли", "Сапарова", "Мухамедов"];

async function main() {
  console.log("Clearing…");
  await db.$transaction([
    db.favorite.deleteMany(),
    db.hotkeyStat.deleteMany(),
    db.quizAttempt.deleteMany(),
    db.submissionFile.deleteMany(),
    db.submission.deleteMany(),
    db.lessonProgress.deleteMany(),
    db.dailyPlanItem.deleteMany(),
    db.dailyPlan.deleteMany(),
    db.lessonHotkey.deleteMany(),
    db.hotkey.deleteMany(),
    db.course.deleteMany(),
    db.studentProfile.deleteMany(),
    db.group.deleteMany(),
    db.teacherProfile.deleteMany(),
    db.user.deleteMany(),
  ]);

  const password = await bcrypt.hash("password123", 10);

  const teacher = await db.user.create({
    data: {
      email: "teacher@designlab.local",
      name: "Жарас Т.",
      passwordHash: password,
      role: "TEACHER",
      teacherProfile: { create: { title: "Преподаватель веб-дизайна" } },
    },
    include: { teacherProfile: true },
  });
  const teacherId = teacher.teacherProfile!.id;

  const { courseId, lessonIds, hotkeyIds } = await createDemoContent(db, teacherId);
  const course = { id: courseId };

  // Group + students
  const group = await db.group.create({ data: { name: "WEB 2-1", inviteCode: "WEB21-LAB", teacherId } });
  await db.groupCourse.create({ data: { groupId: group.id, courseId: course.id } });

  const students = [];
  for (let i = 0; i < 18; i++) {
    const s = await db.user.create({
      data: {
        email: i === 0 ? "student@designlab.local" : `student${i + 1}@designlab.local`,
        name: `${FIRST_NAMES[i]} ${LAST_NAMES[i]}`,
        passwordHash: password,
        role: "STUDENT",
        studentProfile: { create: { groupId: group.id } },
      },
    });
    students.push(s);
  }

  // Schedule relative to today. Past: 0,1,2 · Today: 3 (Смарт-фильтры) · Upcoming: 4,5
  const offsets = [-9, -7, -2, 0, 2, 7];
  for (let i = 0; i < offsets.length; i++) {
    await db.dailyPlan.create({
      data: {
        groupId: group.id,
        lessonId: lessonIds[i],
        date: dayISO(offsets[i]),
        number: i + 1,
        teacherNotes: i === 3 ? "Показать разницу обычного и смарт-фильтра на одном фото. Напомнить про маску фильтра." : "",
        items: {
          create: [
            { start: "09:00", end: "09:15", title: "Теория", order: 0 },
            { start: "09:15", end: "09:30", title: "Демонстрация", order: 1 },
            { start: "09:30", end: "10:10", title: "Практика", order: 2 },
            { start: "10:10", end: "10:20", title: "Тест", order: 3 },
          ],
        },
      },
    });
  }

  // Progress. Demo student: lesson 0 complete, lesson 1 lecture only, lesson 2 untouched → 2 missed.
  const lessons = await db.lesson.findMany({
    where: { id: { in: lessonIds } },
    include: { practice: true, quiz: { include: { questions: { include: { options: true } } } }, hotkeys: true },
  });
  const byId = new Map(lessons.map((l) => [l.id, l]));

  async function completeSteps(
    userId: string,
    lessonId: string,
    steps: { lecture?: boolean; practice?: "SUBMITTED" | "ACCEPTED" | "NEEDS_REVISION"; quiz?: number; hotkeys?: boolean },
  ) {
    const l = byId.get(lessonId)!;
    const daysAgo = Math.floor(Math.random() * 3);
    const at = new Date(Date.now() - daysAgo * 86400000);
    if (steps.practice && l.practice) {
      await db.submission.create({
        data: {
          practiceId: l.practice.id,
          studentId: userId,
          status: steps.practice,
          comment: "Готово, проверьте пожалуйста.",
          submittedAt: at,
          reviewedAt: steps.practice === "SUBMITTED" ? null : at,
          reviewerId: steps.practice === "SUBMITTED" ? null : teacher.id,
          feedback: steps.practice === "NEEDS_REVISION" ? "Края объекта неаккуратные — доработайте маску." : steps.practice === "ACCEPTED" ? "Отлично!" : "",
        },
      });
    }
    if (steps.quiz != null && l.quiz) {
      const total = l.quiz.questions.length;
      const correct = Math.round((steps.quiz / 100) * total);
      const percent = Math.round((correct / total) * 100);
      await db.quizAttempt.create({
        data: { userId, quizId: l.quiz.id, mode: "LESSON", correct, total, percent, passed: percent >= l.quiz.passingScore, answers: {}, createdAt: at },
      });
    }
    if (steps.hotkeys) {
      for (const h of l.hotkeys) {
        await db.hotkeyStat.upsert({
          where: { userId_hotkeyId: { userId, hotkeyId: h.hotkeyId } },
          create: { userId, hotkeyId: h.hotkeyId, correct: 1, attempts: 2 },
          update: { correct: { increment: 1 }, attempts: { increment: 1 } },
        });
      }
    }
    const quizPercent = steps.quiz != null && l.quiz ? Math.round((Math.round((steps.quiz / 100) * l.quiz.questions.length) / l.quiz.questions.length) * 100) : null;
    const allDone =
      steps.lecture && steps.practice && steps.practice !== "NEEDS_REVISION" && quizPercent != null && quizPercent >= 70 && steps.hotkeys;
    await db.lessonProgress.create({
      data: {
        userId,
        lessonId,
        startedAt: at,
        lectureReadAt: steps.lecture ? at : null,
        quizBestPercent: quizPercent,
        quizPassedAt: quizPercent != null && quizPercent >= 70 ? at : null,
        completedAt: allDone ? at : null,
      },
    });
  }

  const demo = students[0];
  await completeSteps(demo.id, lessonIds[0], { lecture: true, practice: "ACCEPTED", quiz: 100, hotkeys: true });
  await completeSteps(demo.id, lessonIds[1], { lecture: true });
  await db.favorite.create({ data: { userId: demo.id, kind: "LECTURE", lessonId: lessonIds[0] } });
  await db.favorite.create({ data: { userId: demo.id, kind: "HOTKEY", hotkeyId: hotkeyIds.psDupLayer } });

  // Other students: a realistic spread
  const rand = (seed: number) => {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  };
  for (const [si, s] of students.slice(1).entries()) {
    for (let li = 0; li <= 3; li++) {
      const r = rand(si * 10 + li);
      if (li < 3 && r < 0.85) {
        await completeSteps(s.id, lessonIds[li], {
          lecture: true,
          practice: r < 0.1 ? "NEEDS_REVISION" : r < 0.6 ? "ACCEPTED" : "SUBMITTED",
          quiz: r < 0.2 ? 50 : 100,
          hotkeys: r < 0.7,
        });
      } else if (li === 3) {
        // today's lesson in progress for the class
        const a = rand(si * 7 + 3);
        await completeSteps(s.id, lessonIds[3], {
          lecture: a < 0.94,
          practice: a < 0.78 ? "SUBMITTED" : undefined,
          quiz: a < 0.88 ? (a < 0.15 ? 60 : 100) : undefined,
        });
      }
    }
  }

  console.log("Seeded.");
  console.log("Teacher: teacher@designlab.local / password123");
  console.log("Student: student@designlab.local / password123");
  console.log("Invite code: WEB21-LAB");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
