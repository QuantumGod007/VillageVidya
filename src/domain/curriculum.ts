import { z } from "zod";
import type { Language, Lesson, Subject } from "./types";
export const learnerGrades = [4, 5, 6, 7, 8, 9, 10] as const;
export type LearnerGrade = (typeof learnerGrades)[number];
export const gradeSchema = z.union([
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
  z.literal(10),
]);
export const boardSchema = z.enum(["cbse", "maharashtra"]);
export type BoardId = z.infer<typeof boardSchema>;
export const academicContextSchema = z.object({
  boardId: boardSchema,
  grade: gradeSchema,
  subject: z.enum(["Mathematics", "Science", "English", "Social Science"]),
  language: z.enum(["English", "हिन्दी", "मराठी", "తెలుగు"]),
});
export type AcademicContext = z.infer<typeof academicContextSchema>;
export interface AcademicBoard {
  id: BoardId;
  name: string;
  coverage: string;
}
export interface AcademicGrade {
  id: string;
  boardId: BoardId;
  number: LearnerGrade;
}
export interface AcademicSubject {
  id: string;
  gradeId: string;
  name: Subject;
}
export interface Chapter {
  id: string;
  subjectId: string;
  title: string;
  order: number;
  kind: "reference" | "supplementary";
  source?: { title: string; url: string; edition: string; verifiedOn: string };
}
export interface Assessment {
  id: string;
  lessonId: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}
export interface CurriculumCatalog {
  boards: AcademicBoard[];
  grades: AcademicGrade[];
  subjects: AcademicSubject[];
  chapters: Chapter[];
  lessons: Lesson[];
  assessments: Assessment[];
}
export interface CurriculumRepository {
  load(): Promise<CurriculumCatalog>;
}
export function lessonsFor(
  library: readonly Lesson[],
  context: AcademicContext,
  allSubjects = false,
) {
  return library.filter(
    (l) =>
      l.boardId === context.boardId &&
      l.grade === context.grade &&
      l.language === context.language &&
      (allSubjects || l.subject === context.subject),
  );
}
export function chapterFor(catalog: CurriculumCatalog, lesson: Lesson) {
  return catalog.chapters.find((c) => c.id === lesson.chapterId);
}
export function chaptersFor(
  catalog: CurriculumCatalog,
  context: AcademicContext,
) {
  const ids = new Set(
    lessonsFor(catalog.lessons, context).map((l) => l.chapterId),
  );
  return catalog.chapters
    .filter((c) => ids.has(c.id))
    .sort((a, b) => a.order - b.order);
}
export function progressFor(
  library: readonly Lesson[],
  progress: Record<string, number>,
  saved: readonly string[] = [],
) {
  return {
    total: library.length,
    complete: library.filter((l) => progress[l.id] === 100).length,
    percent: library.length
      ? Math.round(
          library.reduce((sum, l) => sum + (progress[l.id] || 0), 0) /
            library.length,
        )
      : 0,
    saved: library.filter((l) => saved.includes(l.id)).length,
  };
}
export function tutorContextUrl(context: AcademicContext, lessonId?: string) {
  return `/tutors?${new URLSearchParams({ board: context.boardId, grade: String(context.grade), subject: context.subject, language: context.language, ...(lessonId ? { lesson: lessonId } : {}) })}`;
}
export function readAcademicContext(
  params: URLSearchParams,
  fallback: AcademicContext,
): AcademicContext {
  const parsed = academicContextSchema.safeParse({
    boardId: params.get("board") ?? fallback.boardId,
    grade: params.has("grade") ? Number(params.get("grade")) : fallback.grade,
    subject: params.get("subject") ?? fallback.subject,
    language: params.get("language") ?? fallback.language,
  });
  return parsed.success ? parsed.data : fallback;
}
export function validateCatalog(catalog: CurriculumCatalog): string[] {
  const errors: string[] = [];
  for (const group of [
    catalog.boards,
    catalog.grades,
    catalog.subjects,
    catalog.chapters,
    catalog.lessons,
    catalog.assessments,
  ]) {
    if (new Set(group.map((x) => x.id)).size !== group.length)
      errors.push("Duplicate stable ID");
  }
  for (const g of catalog.grades)
    if (
      !catalog.boards.some((b) => b.id === g.boardId) ||
      !gradeSchema.safeParse(g.number).success
    )
      errors.push(`Invalid grade ${g.id}`);
  for (const s of catalog.subjects)
    if (!catalog.grades.some((g) => g.id === s.gradeId))
      errors.push(`Invalid subject ${s.id}`);
  for (const c of catalog.chapters)
    if (
      !catalog.subjects.some((s) => s.id === c.subjectId) ||
      (c.kind === "reference" && !c.source) ||
      !Number.isInteger(c.order) ||
      c.order < 1
    )
      errors.push(`Invalid chapter ${c.id}`);
  for (const l of catalog.lessons) {
    const c = chapterFor(catalog, l),
      s = catalog.subjects.find((s) => s.id === c?.subjectId),
      g = catalog.grades.find((g) => g.id === s?.gradeId);
    if (
      !academicContextSchema.safeParse(l).success ||
      !g ||
      g.boardId !== l.boardId ||
      g.number !== l.grade ||
      s?.name !== l.subject ||
      !catalog.assessments.some(
        (a) => a.id === l.assessmentId && a.lessonId === l.id,
      )
    )
      errors.push(`Invalid lesson ${l.id}`);
  }
  for (const a of catalog.assessments)
    if (
      !catalog.lessons.some(
        (l) => l.id === a.lessonId && l.assessmentId === a.id,
      ) ||
      !Number.isInteger(a.answer) ||
      a.options.length < 2 ||
      !a.question.trim() ||
      a.options.some((option) => !option.trim()) ||
      a.answer < 0 ||
      a.answer >= a.options.length
    )
      errors.push(`Invalid assessment ${a.id}`);
  return errors;
}
export const languageOptions: Language[] = [
  "English",
  "हिन्दी",
  "मराठी",
  "తెలుగు",
];
export const subjectOptions: Subject[] = [
  "Mathematics",
  "Science",
  "English",
  "Social Science",
];
