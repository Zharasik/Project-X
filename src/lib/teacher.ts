import "server-only";
import { db } from "@/lib/db";
import { getCourseOutline, flattenLessons, getLessonStates } from "@/lib/progress";

export interface StepCounts {
  students: number;
  lecture: number;
  practice: number;
  quiz: number;
  hasLecture: boolean;
  hasPractice: boolean;
  hasQuiz: boolean;
}

/** How many students of a group have done each step of a lesson (17/18 lecture, 14/18 practice…). */
export async function getLessonGroupStats(lessonId: string, studentIds: string[]): Promise<StepCounts> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { lecture: { select: { id: true } }, practice: { select: { id: true } }, quiz: { select: { id: true } } },
  });
  const [lecture, practice, quiz] = await Promise.all([
    db.lessonProgress.count({ where: { lessonId, userId: { in: studentIds }, lectureReadAt: { not: null } } }),
    lesson?.practice
      ? db.submission.count({
          where: { practiceId: lesson.practice.id, studentId: { in: studentIds }, status: { not: "NEEDS_REVISION" } },
        })
      : 0,
    db.lessonProgress.count({ where: { lessonId, userId: { in: studentIds }, quizPassedAt: { not: null } } }),
  ]);
  return {
    students: studentIds.length,
    lecture,
    practice,
    quiz,
    hasLecture: !!lesson?.lecture,
    hasPractice: !!lesson?.practice,
    hasQuiz: !!lesson?.quiz,
  };
}

export async function getTeacherGroups(teacherId: string) {
  return db.group.findMany({
    where: { teacherId },
    orderBy: { name: "asc" },
    include: {
      students: { select: { userId: true } },
      courses: { include: { course: { select: { id: true, title: true } } } },
    },
  });
}

/** Per-student course progress for a group (published content only, as students see it). */
export async function getGroupProgress(groupId: string) {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      students: { include: { user: { select: { id: true, name: true, email: true, createdAt: true } } } },
      courses: { select: { courseId: true } },
    },
  });
  if (!group) return null;

  const outlines = (await Promise.all(group.courses.map((c) => getCourseOutline(c.courseId)))).filter((o) => o !== null);
  const lessons = outlines.flatMap(flattenLessons);
  const lessonIds = lessons.map((l) => l.id);

  const rows = await Promise.all(
    group.students.map(async (s) => {
      const states = await getLessonStates(s.user.id, lessonIds);
      const completed = lessonIds.filter((id) => states.get(id)?.status === "completed").length;
      const [quizAvg, pending] = await Promise.all([
        db.lessonProgress.aggregate({
          where: { userId: s.user.id, quizBestPercent: { not: null } },
          _avg: { quizBestPercent: true },
        }),
        db.submission.count({ where: { studentId: s.user.id, status: "SUBMITTED" } }),
      ]);
      return {
        user: s.user,
        states,
        completed,
        percent: lessonIds.length ? Math.round((completed / lessonIds.length) * 100) : 0,
        quizAvg: quizAvg._avg.quizBestPercent != null ? Math.round(quizAvg._avg.quizBestPercent) : null,
        pending,
      };
    }),
  );
  rows.sort((a, b) => a.user.name.localeCompare(b.user.name, "ru"));
  return { group, lessons, rows };
}
