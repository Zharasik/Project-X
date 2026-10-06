import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { getAccessibleLesson, getLessonState, touchLesson } from "@/lib/progress";
import { toPublicQuestion } from "@/lib/quiz";
import { pad2, plural } from "@/lib/utils";
import { submitLessonQuiz } from "@/lib/actions/student";
import { LessonCrumbs } from "@/components/student/lesson-header";
import { STEP_LABEL } from "@/components/student/steps";
import { QuizRunner } from "@/components/student/quiz-runner";

type Props = { params: Promise<{ lessonId: string }> };

export const metadata: Metadata = { title: "Тест" };

export default async function LessonQuizPage({ params }: Props) {
  const { lessonId } = await params;
  const user = await requireStudent();
  const lesson = await getAccessibleLesson(user.studentProfile.groupId, lessonId);
  if (!lesson?.quiz) notFound();
  const quiz = lesson.quiz;

  await touchLesson(user.id, lesson.id);
  const [questions, attempts, state] = await Promise.all([
    db.question.findMany({
      where: { quizId: quiz.id },
      orderBy: { order: "asc" },
      include: { options: { orderBy: { order: "asc" } } },
    }),
    db.quizAttempt.findMany({
      where: { userId: user.id, quizId: quiz.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    getLessonState(user.id, lesson.id),
  ]);
  if (questions.length === 0) notFound();

  const stepIndex = (state?.steps.findIndex((s) => s.key === "quiz") ?? 2) + 1;
  const after = state?.steps.find((s) => s.key !== "quiz" && s.state !== "done");
  const nextHref = after?.href ?? `/lessons/${lesson.id}`;
  const nextLabel = after ? `Дальше: ${STEP_LABEL[after.key]}` : "К теме";
  const best = attempts.reduce((m, a) => Math.max(m, a.percent), 0);
  const submit = submitLessonQuiz.bind(null, lesson.id);

  return (
    <div className="mx-auto max-w-2xl">
      <LessonCrumbs lesson={lesson} step="Тест" />
      <header className="mt-8 mb-8">
        <p className="font-mono text-xs text-fg-3">{pad2(stepIndex)} — Тест</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-display text-balance">{lesson.title}</h1>
        <p className="mt-2 text-sm text-fg-2">
          {questions.length} {plural(questions.length, "вопрос", "вопроса", "вопросов")}
          {attempts.length > 0 && (
            <>
              {" · "}лучший результат <span className="font-mono tnum text-fg">{best}%</span>
              {" · "}последняя попытка {formatDateTime(attempts[0].createdAt)}
            </>
          )}
        </p>
      </header>
      <QuizRunner
        questions={questions.map(toPublicQuestion)}
        onSubmit={submit}
        passingScore={quiz.passingScore}
        nextHref={nextHref}
        nextLabel={nextLabel}
      />
    </div>
  );
}
