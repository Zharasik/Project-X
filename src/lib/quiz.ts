import type { Question, QuestionOption, QuestionType } from "@prisma/client";

/** What the client sees before submitting: no `isCorrect`. */
export interface PublicQuestion {
  id: string;
  type: QuestionType;
  text: string;
  options: { id: string; text: string }[];
}

export interface GradedQuestion extends PublicQuestion {
  selected: string[];
  correctIds: string[];
  isCorrect: boolean;
  explanation: string;
}

export interface QuizResult {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  passingScore: number;
  questions: GradedQuestion[];
}

type FullQuestion = Question & { options: QuestionOption[] };

export function toPublicQuestion(q: FullQuestion): PublicQuestion {
  return {
    id: q.id,
    type: q.type,
    text: q.text,
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
  };
}

/** A question is correct only if the selected set equals the correct set exactly. */
export function gradeAnswers(
  questions: FullQuestion[],
  answers: Record<string, string[]>,
  passingScore: number,
): QuizResult {
  const graded = questions.map((q) => {
    const validIds = new Set(q.options.map((o) => o.id));
    const selected = [...new Set(answers[q.id] ?? [])].filter((id) => validIds.has(id));
    const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
    const isCorrect =
      selected.length === correctIds.length && correctIds.every((id) => selected.includes(id));
    return { ...toPublicQuestion(q), selected, correctIds, isCorrect, explanation: q.explanation };
  });
  const correct = graded.filter((g) => g.isCorrect).length;
  const total = graded.length;
  const percent = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percent, passed: percent >= passingScore, passingScore, questions: graded };
}

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE: "Один ответ",
  MULTIPLE: "Несколько ответов",
  TRUE_FALSE: "Верно / неверно",
};
