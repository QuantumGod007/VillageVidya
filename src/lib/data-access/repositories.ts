import type { SupabaseClient } from "@supabase/supabase-js";
import {
  boardSchema,
  gradeSchema,
  validateCatalog,
  type CurriculumCatalog,
  type CurriculumRepository,
} from "../../domain/curriculum";
import type { Language } from "../../domain/types";
import type { Database, Tables } from "./database.types";

function unwrap<T>(
  result: { data: T | null; error: unknown },
  operation: string,
): T {
  if (result.error || result.data === null)
    throw new Error(`Database operation failed: ${operation}.`);
  return result.data;
}
export function supabaseCurriculumRepository(
  client: SupabaseClient<Database>,
): CurriculumRepository {
  return {
    async load() {
      const [
        boards,
        grades,
        subjects,
        chapters,
        lessons,
        assessments,
        sources,
      ] = await Promise.all([
        client.from("academic_boards").select("*").order("id"),
        client.from("academic_grades").select("*").order("id"),
        client.from("academic_subjects").select("*").order("id"),
        client.from("chapters").select("*").order("position"),
        client.from("lessons").select("*").order("position"),
        client.from("assessments").select("*").order("id"),
        client.from("curriculum_sources").select("*").order("id"),
      ]);
      const b = unwrap(boards, "read boards"),
        g = unwrap(grades, "read grades"),
        s = unwrap(subjects, "read subjects"),
        c = unwrap(chapters, "read chapters"),
        l = unwrap(lessons, "read lessons"),
        a = unwrap(assessments, "read assessments"),
        src = unwrap(sources, "read sources");
      // Fail rather than silently returning a catalog truncated by the API cap.
      if ([b, g, s, c, l, a, src].some((rows) => rows.length >= 1000))
        throw new Error(
          "Catalog requires paginated loading before expansion beyond 999 records per table.",
        );
      const catalog: CurriculumCatalog = {
        boards: b.map((row) => ({
          id: boardSchema.parse(row.id),
          name: row.name,
          coverage: row.coverage,
        })),
        grades: g.map((row) => ({
          id: row.id,
          boardId: boardSchema.parse(row.board_id),
          number: gradeSchema.parse(row.number),
        })),
        subjects: s.map((row) => ({
          id: row.id,
          gradeId: row.grade_id,
          name: row.name,
        })),
        chapters: c.map((row) => {
          const reference = src.find((item) => item.id === row.source_id);
          return {
            id: row.id,
            subjectId: row.subject_id,
            title: row.title,
            order: row.position,
            kind: row.kind,
            ...(reference
              ? {
                  source: {
                    title: reference.title,
                    url: reference.url,
                    edition: reference.edition,
                    verifiedOn: reference.verified_on,
                  },
                }
              : {}),
          };
        }),
        lessons: l.map((row) => {
          const chapter = c.find((ch) => ch.id === row.chapter_id),
            subject = s.find((item) => item.id === chapter?.subject_id),
            grade = g.find((item) => item.id === subject?.grade_id),
            checkpoint = a.find((item) => item.lesson_id === row.id);
          if (!chapter || !subject || !grade || !checkpoint)
            throw new Error(
              "Published lesson has an incomplete academic path or checkpoint.",
            );
          return {
            id: row.id,
            boardId: boardSchema.parse(grade.board_id),
            grade: gradeSchema.parse(grade.number),
            subject: subject.name,
            chapterId: row.chapter_id,
            assessmentId: checkpoint.id,
            language: row.language,
            title: row.title,
            subtitle: row.subtitle,
            minutes: row.minutes,
            concept: row.concept,
            steps: row.steps,
            example: row.example,
            keywords: row.keywords,
          };
        }),
        assessments: a.map((row) => ({
          id: row.id,
          lessonId: row.lesson_id,
          question: row.question,
          options: row.options,
          answer: row.answer_index,
          explanation: row.explanation,
        })),
      };
      if (validateCatalog(catalog).length)
        throw new Error("Published curriculum failed domain validation.");
      return catalog;
    },
  };
}
export interface LearnerRepository {
  progress(): Promise<Tables<"lesson_progress">[]>;
  attempts(): Promise<Tables<"assessment_attempts">[]>;
  bookmarks(): Promise<Tables<"learner_bookmarks">[]>;
  setBookmark(lessonId: string, saved: boolean): Promise<void>;
  enroll(subjectId: string, language: Language): Promise<void>;
}
export function supabaseLearnerRepository(
  client: SupabaseClient<Database>,
): LearnerRepository {
  async function identity() {
    // Server-validated auth, not a demo role or a localStorage user ID.
    const result = await client.auth.getUser();
    if (result.error || !result.data.user)
      throw new Error("A verified signed-in identity is required.");
    return result.data.user.id;
  }
  return {
    async progress() {
      return unwrap(
        await client
          .from("lesson_progress")
          .select("*")
          .eq("learner_id", await identity()),
        "read progress",
      );
    },
    async attempts() {
      return unwrap(
        await client
          .from("assessment_attempts")
          .select("*")
          .eq("learner_id", await identity())
          .order("created_at", { ascending: false }),
        "read attempts",
      );
    },
    async bookmarks() {
      return unwrap(
        await client
          .from("learner_bookmarks")
          .select("*")
          .eq("learner_id", await identity()),
        "read bookmarks",
      );
    },
    async setBookmark(lessonId, saved) {
      const learner_id = await identity();
      const result = saved
        ? await client
            .from("learner_bookmarks")
            .upsert(
              { learner_id, lesson_id: lessonId },
              { onConflict: "learner_id,lesson_id", ignoreDuplicates: true },
            )
        : await client
            .from("learner_bookmarks")
            .delete()
            .eq("learner_id", learner_id)
            .eq("lesson_id", lessonId);
      if (result.error) throw new Error("Could not change this bookmark.");
    },
    async enroll(subject_id, language) {
      const learner_id = await identity();
      const result = await client.from("learner_academic_enrollments").upsert(
        { learner_id, subject_id, language },
        {
          onConflict: "learner_id,subject_id,language",
          ignoreDuplicates: true,
        },
      );
      if (result.error) throw new Error("Could not record this enrollment.");
    },
  };
}
