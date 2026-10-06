import type { Metadata } from "next";
import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { toPublicQuestion } from "@/lib/quiz";
import { submitQuickQuiz } from "@/lib/actions/student";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { QuizRunner } from "@/components/student/quiz-runner";

export const metadata: Metadata = { title: "Быстрый тест" };
export const dynamic = "force-dynamic";

const QUICK_SIZE = 5;

/** 5 random questions from lessons the student has started (falls back to all available). */
export default async function QuickQuizPage() {
  const user = await requireStudent();
  const accessible = {
    published: true,
    module: { published: true, course: { published: true, groups: { some: { groupId: user.studentProfile.groupId } } } },
  };
  const started = await db.lessonProgress.findMany({ where: { userId: user.id }, select: { lessonId: true } });

  let pool = await db.question.findMany({
    where: { quiz: { lesson: { ...accessible, id: { in: started.map((s) => s.lessonId) } } } },
    select: { id: true },
  });
  if (pool.length < QUICK_SIZE) {
    pool = await db.question.findMany({ where: { quiz: { lesson: accessible } }, select: { id: true } });
  }

  const ids = pool
    .map((q) => q.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, QUICK_SIZE);
  const questions = await db.question.findMany({
    where: { id: { in: ids } },
    include: { options: { orderBy: { order: "asc" } } },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Повторение"
        title="Быстрый тест"
        description={`${QUICK_SIZE} случайных вопросов из пройденных тем. Результат не влияет на прогресс.`}
      />
      {questions.length === 0 ? (
        <EmptyState title="Пока нет вопросов" description="Вопросы появятся, когда преподаватель добавит тесты." action={<LinkButton href="/">На главную</LinkButton>} />
      ) : (
        <QuizRunner
          questions={questions.map(toPublicQuestion)}
          onSubmit={submitQuickQuiz.bind(null, ids)}
          passingScore={70}
          restartHref="/quiz/quick"
        />
      )}
    </div>
  );
}
