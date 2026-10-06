import { getTeacherLesson } from "@/lib/teacher-lesson";
import { Panel, SectionTitle } from "@/components/ui/misc";
import { QuestionList, QuizSettingsForm } from "@/components/teacher/quiz-editor";

export default async function QuizEditorPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = await getTeacherLesson(lessonId);
  const questions = (lesson.quiz?.questions ?? []).map((q) => ({
    id: q.id,
    type: q.type,
    text: q.text,
    explanation: q.explanation,
    options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
  }));
  return (
    <div className="max-w-3xl space-y-8">
      <Panel className="p-5">
        <QuizSettingsForm lessonId={lesson.id} quiz={lesson.quiz} />
      </Panel>
      <section>
        <SectionTitle>Вопросы · {questions.length}</SectionTitle>
        <QuestionList lessonId={lesson.id} questions={questions} />
      </section>
    </div>
  );
}
