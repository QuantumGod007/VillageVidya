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
  enrollments(): Promise<Tables<"learner_academic_enrollments">[]>;
  activity(): Promise<Tables<"learner_lesson_activity">[]>;
  recordReading(lessonId: string, read: boolean): Promise<void>;
  enroll(subjectId: string, language: Language): Promise<void>;
}
export function supabaseLearnerRepository(
  client: SupabaseClient<Database>,
): LearnerRepository {
  async function identity() {
    const session = await client.auth.getSession();
    if (session.error || !session.data.session)
      throw new Error("A verified signed-in identity is required.");
    const token = session.data.session.access_token;
    const result = await client.auth.getUser(token);
    if (result.error || !result.data.user)
      throw new Error("A verified signed-in identity is required.");
    const id = result.data.user.id;
    const header = `Bearer ${token}`;
    // Pin each request to the verified session. A sign-in on this shared client
    // while a request is pending must not apply the old account's intent to it.
    const learner = await client
      .from("learner_profiles")
      .select("user_id")
      .eq("user_id", id)
      .setHeader("Authorization", header)
      .single();
    if (learner.error || !learner.data)
      throw new Error(
        "Learner access is unavailable or your session ended. Sign in again.",
      );
    return { id, header };
  }
  return {
    async progress() {
      const owner = await identity();
      return unwrap(
        await client
          .from("lesson_progress")
          .select("*")
          .eq("learner_id", owner.id)
          .setHeader("Authorization", owner.header),
        "read progress",
      );
    },
    async attempts() {
      const owner = await identity();
      return unwrap(
        await client
          .from("assessment_attempts")
          .select("*")
          .eq("learner_id", owner.id)
          .order("created_at", { ascending: false })
          .setHeader("Authorization", owner.header),
        "read attempts",
      );
    },
    async bookmarks() {
      const owner = await identity();
      return unwrap(
        await client
          .from("learner_bookmarks")
          .select("*")
          .eq("learner_id", owner.id)
          .setHeader("Authorization", owner.header),
        "read bookmarks",
      );
    },
    async setBookmark(lessonId, saved) {
      const owner = await identity();
      const query = saved
        ? client
            .from("learner_bookmarks")
            .upsert(
              { learner_id: owner.id, lesson_id: lessonId },
              { onConflict: "learner_id,lesson_id", ignoreDuplicates: true },
            )
        : client
            .from("learner_bookmarks")
            .delete()
            .eq("learner_id", owner.id)
            .eq("lesson_id", lessonId);
      const result = await query.setHeader("Authorization", owner.header);
      if (result.error) throw new Error("Could not change this bookmark.");
      const still = await identity();
      if (still.id !== owner.id)
        throw new Error("Your account changed. Refresh your workspace.");
      const confirmed = await client
        .from("learner_bookmarks")
        .select("lesson_id")
        .eq("learner_id", owner.id)
        .eq("lesson_id", lessonId)
        .setHeader("Authorization", owner.header)
        .maybeSingle();
      if (confirmed.error || !!confirmed.data !== saved)
        throw new Error(
          "Bookmark state changed or could not be confirmed. Refresh and retry.",
        );
    },
    async enrollments() {
      const owner = await identity();
      return unwrap(
        await client
          .from("learner_academic_enrollments")
          .select("*")
          .eq("learner_id", owner.id)
          .order("created_at")
          .setHeader("Authorization", owner.header),
        "read enrolments",
      );
    },
    async activity() {
      const owner = await identity();
      return unwrap(
        await client
          .from("learner_lesson_activity")
          .select("*")
          .eq("learner_id", owner.id)
          .order("started_at", { ascending: false })
          .setHeader("Authorization", owner.header),
        "read reading activity",
      );
    },
    async recordReading(p_lesson_id, p_mark_read) {
      const owner = await identity();
      const result = await client
        .rpc("record_learner_reading", { p_lesson_id, p_mark_read })
        .setHeader("Authorization", owner.header);
      if (result.error || !result.data)
        throw new Error(
          "Could not record reading activity. Check your connection and learner access, then retry.",
        );
    },
    async enroll(p_subject_id, p_language) {
      const owner = await identity();
      const result = await client
        .rpc("switch_learner_enrollment", { p_subject_id, p_language })
        .setHeader("Authorization", owner.header);
      if (result.error || !result.data)
        throw new Error(
          "Could not switch your academic selection. Refresh the catalog or sign in again, then retry.",
        );
    },
  };
}
