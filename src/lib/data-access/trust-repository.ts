import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
const uuid = z.string().uuid(),
  date = z.string(),
  review = z.enum(["pending", "approved", "rejected", "revoked"]);
export const safetyStatus = z.enum([
  "submitted",
  "under_review",
  "resolved",
  "closed",
]);
const report = z
  .object({
    id: uuid,
    category: z.enum(["conduct", "content", "access", "other"]),
    summary: z.string(),
    status: safetyStatus,
    revision: z.number().int().positive(),
    created_at: date,
    updated_at: date,
  })
  .strict();
export const trustWorkspaceSchema = z
  .object({
    test_only: z.literal(true),
    as_of: date,
    staff: z.boolean(),
    administrator: z.boolean(),
    tutor_reviews: z
      .array(
        z
          .object({
            tutor_id: uuid,
            label: z.string(),
            academic_grade: z.number(),
            teaching_skill_score: z.number().nullable(),
            status: z.enum([
              "not_started",
              "pending",
              "approved",
              "rejected",
              "revoked",
            ]),
            last_event: z.number(),
            last_reason: z.string().nullable(),
            reviewed_at: date.nullable(),
            reviewer_id: uuid.nullable(),
            token: z.string(),
            subjects: z.array(z.string()),
            languages: z.array(z.string()),
            evidence: z
              .object({
                label: z.literal("synthetic_classroom"),
                note: z.string(),
                prepared_by: uuid,
                created_at: date,
                event_number: z.number(),
              })
              .strict()
              .nullable(),
            approval_missing: z.array(z.string()),
          })
          .strict(),
      )
      .max(50),
    relationships: z
      .array(
        z
          .object({
            id: uuid,
            guardian_id: uuid,
            learner_id: uuid,
            status: review,
            revision: z.number(),
            consent_status: z.enum([
              "not_recorded",
              "pending",
              "approved",
              "rejected",
              "revoked",
            ]),
            consent_event: z.number(),
            policy_version: z.string().nullable(),
            recorded_at: date.nullable(),
            can_share: z.boolean(),
          })
          .strict(),
      )
      .max(50),
    reports: z.array(report).max(50),
    safety_queue: z.array(report).max(50),
    accounts: z
      .array(
        z
          .object({
            id: uuid,
            label: z.string(),
            enabled: z.boolean(),
            available: z.boolean(),
            roles: z.array(
              z.enum(["learner", "tutor", "guardian", "champion", "admin"]),
            ),
          })
          .strict(),
      )
      .max(50),
    recent_actions: z
      .array(
        z
          .object({
            id: uuid,
            operation: z.enum([
              "tutor_review",
              "relationship_review",
              "consent",
              "safety_review",
            ]),
            subject_id: uuid,
            actor_id: uuid,
            reason: z.string(),
            created_at: date,
          })
          .strict(),
      )
      .max(50),
    more: z
      .object({
        tutors: z.boolean(),
        relationships: z.boolean(),
        reports: z.boolean(),
        safety: z.boolean(),
        accounts: z.boolean(),
        actions: z.boolean(),
      })
      .strict(),
  })
  .strict();
export const trustHistorySchema = z
  .object({
    records: z
      .array(
        z
          .object({
            event_number: z.number(),
            status: z.string(),
            actor_id: uuid,
            note: z.string(),
            created_at: date,
            verified_grade: z.number().nullable(),
            policy_version: z.string().nullable(),
            from_status: z.string().nullable(),
          })
          .strict(),
      )
      .max(20),
    more: z.boolean(),
    next_before: z.number().nullable(),
  })
  .strict();
export const linkedLearnerSchema = z
  .object({
    test_only: z.literal(true),
    as_of: date,
    display_name: z.string(),
    language: z.string(),
    enrollments: z.array(
      z
        .object({
          subject_id: z.string(),
          language: z.string(),
          is_active: z.boolean(),
        })
        .strict(),
    ),
    progress: z.array(
      z
        .object({
          lesson_id: z.string(),
          checkpoint_percent: z.number().min(0).max(100),
        })
        .strict(),
    ),
  })
  .strict();
export type TrustSnapshot = z.infer<typeof trustWorkspaceSchema>;
export type TutorReview = TrustSnapshot["tutor_reviews"][number];
export type TestRelationship = TrustSnapshot["relationships"][number];
export type SafetyReport = TrustSnapshot["reports"][number];
export type TrustHistory = z.infer<typeof trustHistorySchema>;
export type LinkedLearner = z.infer<typeof linkedLearnerSchema>;
export type ReviewDecision = "approved" | "rejected" | "revoked";
export type SafetyStatus = z.infer<typeof safetyStatus>;
export type HistoryKind = "tutor" | "consent" | "safety";
export interface TrustRepository {
  load(query?: string): Promise<TrustSnapshot>;
  history(
    kind: HistoryKind,
    id: string,
    before?: number | null,
  ): Promise<TrustHistory>;
  learner(relationshipId: string): Promise<LinkedLearner>;
  reviewTutor(input: {
    tutorId: string;
    token: string;
    status: ReviewDecision;
    grade: number | null;
    reason: string;
    requestId: string;
  }): Promise<void>;
  relationship(input: {
    guardianId: string;
    learnerId: string;
    revision: number;
    status: "approved" | "revoked";
    reason: string;
    requestId: string;
  }): Promise<void>;
  consent(input: {
    relationshipId: string;
    expectedEvent: number;
    grant: boolean;
    reason: string;
    requestId: string;
  }): Promise<void>;
  submitReport(input: {
    submissionId: string;
    category: SafetyReport["category"];
    summary: string;
  }): Promise<string>;
  reviewReport(input: {
    reportId: string;
    revision: number;
    status: SafetyStatus;
    note: string;
    requestId: string;
  }): Promise<void>;
}
function databaseError(error: { code?: string } | null) {
  if (!error) return;
  throw new Error(
    error.code === "40001"
      ? "The authoritative record changed. Refresh before making a new decision."
      : error.code === "22023"
        ? "The action, transition or required reason is invalid. Refresh the record and check your inputs."
        : "This operation could not verify your role/session or reach the server. Refresh and sign in again if needed.",
  );
}
export function supabaseTrustRepository(
  client: SupabaseClient<Database>,
): TrustRepository {
  async function header() {
    const session = await client.auth.getSession();
    const token = session.data.session?.access_token;
    if (session.error || !token)
      throw new Error("A signed-in adult test identity is required.");
    const user = await client.auth.getUser(token);
    if (user.error || !user.data.user)
      throw new Error("Your session ended. Sign in again.");
    return `Bearer ${token}`;
  }
  async function rpc<N extends keyof Database["public"]["Functions"]>(
    name: N,
    args: Database["public"]["Functions"][N]["Args"],
  ) {
    const result = await client
      .rpc(name, args)
      .setHeader("Authorization", await header())
      .abortSignal(AbortSignal.timeout(15_000));
    databaseError(result.error);
    if (result.data === null)
      throw new Error("No confirmed server result. Refresh before retrying.");
    return result.data;
  }
  return {
    async load(p_query = "") {
      return trustWorkspaceSchema.parse(
        await rpc("load_test_trust_workspace", { p_query }),
      );
    },
    async history(p_kind, p_subject_id, p_before_event = null) {
      return trustHistorySchema.parse(
        await rpc("load_test_trust_history", {
          p_kind,
          p_subject_id,
          p_before_event: p_before_event!,
        }),
      );
    },
    async learner(p_relationship_id) {
      return linkedLearnerSchema.parse(
        await rpc("read_linked_test_learner", { p_relationship_id }),
      );
    },
    async reviewTutor(i) {
      await rpc("review_test_tutor", {
        p_tutor_id: i.tutorId,
        p_token: i.token,
        p_status: i.status,
        p_grade: i.grade!,
        p_reason: i.reason,
        p_request_id: i.requestId,
      });
    },
    async relationship(i) {
      await rpc("review_test_relationship", {
        p_guardian_id: i.guardianId,
        p_learner_id: i.learnerId,
        p_revision: i.revision,
        p_status: i.status,
        p_reason: i.reason,
        p_request_id: i.requestId,
      });
    },
    async consent(i) {
      await rpc("record_test_consent", {
        p_relationship_id: i.relationshipId,
        p_expected_event: i.expectedEvent,
        p_grant: i.grant,
        p_reason: i.reason,
        p_request_id: i.requestId,
      });
    },
    async submitReport(i) {
      return uuid.parse(
        await rpc("submit_test_safety_report", {
          p_submission_id: i.submissionId,
          p_category: i.category,
          p_summary: i.summary,
        }),
      );
    },
    async reviewReport(i) {
      await rpc("review_test_safety_report", {
        p_report_id: i.reportId,
        p_revision: i.revision,
        p_status: i.status,
        p_note: i.note,
        p_request_id: i.requestId,
      });
    },
  };
}
