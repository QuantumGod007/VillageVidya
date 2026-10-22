import { lessons, assessments } from "./demo";
import {
  learnerGrades,
  type AcademicSubject,
  type CurriculumCatalog,
  type CurriculumRepository,
} from "../domain/curriculum";
const subjects: AcademicSubject[] = [];
for (const lesson of lessons) {
  const id = `${lesson.boardId}-${lesson.grade}-${lesson.subject.toLowerCase().replaceAll(" ", "-")}`;
  if (!subjects.some((s) => s.id === id))
    subjects.push({
      id,
      gradeId: `${lesson.boardId}-${lesson.grade}`,
      name: lesson.subject,
    });
}
export const curriculum: CurriculumCatalog = {
  boards: [
    {
      id: "cbse",
      name: "CBSE",
      coverage:
        "Limited NCERT reference sample and original supplementary practice. Not a complete or current-year syllabus.",
    },
    {
      id: "maharashtra",
      name: "Maharashtra State Board",
      coverage: "No verified curriculum has been added for this board yet.",
    },
  ],
  grades: ["cbse", "maharashtra"].flatMap((board) =>
    learnerGrades.map((number) => ({
      id: `${board}-${number}`,
      boardId: board as "cbse" | "maharashtra",
      number,
    })),
  ),
  subjects,
  chapters: [
    ...lessons
      .filter((l) => l.grade !== 10 && l.id !== "equations")
      .map((l, i) => ({
        id: l.chapterId,
        subjectId: subjects.find(
          (s) => s.gradeId === `cbse-${l.grade}` && s.name === l.subject,
        )!.id,
        title: `Supplementary: ${l.id === "fractions" ? "Fractions" : l.id === "photosynthesis" ? "Plant nutrition" : l.id === "water" ? "Water cycle" : l.id === "tenses" ? "Verb tenses" : "Local government"}`,
        order: i + 1,
        kind: "supplementary" as const,
      })),
    {
      id: "cbse-8-math-linear-equations",
      subjectId: "cbse-8-mathematics",
      title: "Linear Equations in One Variable",
      order: 2,
      kind: "reference",
      source: {
        title: "NCERT Mathematics, Class VIII · Chapter 2",
        url: "https://www.ncert.nic.in/textbook/pdf/hemh102.pdf",
        edition: "Reprint 2024–25",
        verifiedOn: "2026-10-22",
      },
    },
    {
      id: "cbse-10-math-real-numbers",
      subjectId: "cbse-10-mathematics",
      title: "Real Numbers",
      order: 1,
      kind: "reference",
      source: {
        title: "NCERT Mathematics, Class X · Chapter 1",
        url: "https://www.ncert.nic.in/textbook/pdf/jemh1ps.pdf",
        edition: "Reprint 2025–26 · contents, section 1.2",
        verifiedOn: "2026-10-22",
      },
    },
  ],
  lessons,
  assessments,
};
export const demoCurriculumRepository: CurriculumRepository = {
  load: async () => curriculum,
};
