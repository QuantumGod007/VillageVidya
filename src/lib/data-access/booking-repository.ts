import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Language } from "../../domain/types";
const uuid = z.string().uuid(),
  date = z.string().datetime({ offset: true });
const participant = z.enum(["learner", "tutor"]);
const context = {
  id: uuid,
  viewer_role: participant,
  tutor_label: z.string(),
  learner_label: z.string(),
  subject_id: z.string(),
  subject: z.string(),
  language: z.enum(["English", "हिन्दी", "मराठी", "తెలుగు"]),
  starts_at: date,
  ends_at: date,
  revision: z.number().int().positive(),
};
export const bookingSchema = z
  .object({
    test_only: z.literal(true),
    as_of: date,
    more: z.boolean(),
    requests: z
      .array(
        z
          .object({
            ...context,
            topic: z.string(),
            created_at: date,
            updated_at: date,
            expires_at: date,
            search_expires_at: date,
            status: z.enum([
              "pending",
              "accepted",
              "declined",
              "expired",
              "cancelled",
            ]),
            session_id: uuid.nullable(),
            can_fallback: z.boolean(),
          })
          .strict(),
      )
      .max(50),
    sessions: z
      .array(
        z
          .object({
            ...context,
            request_id: uuid,
            status: z.enum([
              "scheduled",
              "active",
              "completed",
              "cancelled",
              "missed",
            ]),
            started_at: date.nullable(),
            completed_at: date.nullable(),
            cancelled_at: date.nullable(),
            summary: z.string(),
            history: z
              .array(
                z
                  .object({
                    event_number: z.number(),
                    status: z.string(),
                    actor_role: participant,
                    created_at: date,
                    note: z.string(),
                  })
                  .strict(),
              )
              .max(4),
          })
          .strict(),
      )
      .max(50),
  })
  .strict();
export type BookingSnapshot = z.infer<typeof bookingSchema>;
export type TestRequest = BookingSnapshot["requests"][number];
export type TestSession = BookingSnapshot["sessions"][number];
export interface RequestInput {
  intentId: string;
  previewId?: string;
  subjectId?: string;
  language?: Language;
  startsAt?: string;
  durationMinutes?: number;
  topic?: string;
  previousRequestId?: string;
}
export interface ActorBookingRepository {
  load(recordId?: string | null): Promise<BookingSnapshot>;
  request(input: RequestInput): Promise<string>;
  respond(input: {
    requestId: string;
    revision: number;
    action: "accept" | "decline" | "cancel";
    intentId: string;
  }): Promise<string>;
  transition(input: {
    sessionId: string;
    revision: number;
    action: "start" | "complete" | "cancel";
    note: string;
    intentId: string;
  }): Promise<string>;
}
export interface BookingRepository {
  forActor(actorId: string): ActorBookingRepository;
}
export function supabaseBookingRepository(
  client: SupabaseClient<Database>,
): BookingRepository {
  return {
    forActor(actorId) {
      async function header() {
        const session = await client.auth.getSession(),
          current = session.data.session;
        if (session.error || !current || current.user.id !== actorId)
          throw new Error(
            "The active account changed. Sign in again before continuing.",
          );
        const verified = await client.auth.getUser(current.access_token);
        if (verified.error || verified.data.user?.id !== actorId)
          throw new Error("Your session ended. Sign in again.");
        const latest = await client.auth.getSession();
        if (latest.error || latest.data.session?.user.id !== actorId)
          throw new Error(
            "The active account changed. This action was not sent.",
          );
        return `Bearer ${current.access_token}`;
      }
      async function rpc<N extends keyof Database["public"]["Functions"]>(
        name: N,
        args: Database["public"]["Functions"][N]["Args"],
      ) {
        const auth = await header();
        const result = await client
          .rpc(name, args)
          .setHeader("Authorization", auth)
          .abortSignal(AbortSignal.timeout(15_000));
        if (result.error)
          throw new Error(
            result.error.code === "40001"
              ? "The record changed. Refresh before making a new decision."
              : result.error.code === "23P01"
                ? "This interval is already reserved for a participant. Choose another time."
                : result.error.code === "22023"
                  ? "This action is no longer valid. Check the response deadline, schedule, note and current status, then refresh."
                  : "The server could not verify current adult-test access, eligibility or availability. Refresh and sign in again if needed.",
          );
        if (result.data === null)
          throw new Error(
            "No confirmed server result. Refresh before retrying.",
          );
        return result.data;
      }
      return {
        async load(p_record_id = null) {
          return bookingSchema.parse(
            await rpc("load_test_bookings", { p_record_id: p_record_id! }),
          );
        },
        async request(i) {
          return uuid.parse(
            await rpc("request_test_tutor", {
              p_intent_id: i.intentId,
              p_preview_id: i.previewId!,
              p_subject_id: i.subjectId!,
              p_language: i.language!,
              p_starts_at: i.startsAt!,
              p_duration_minutes: i.durationMinutes ?? 15,
              p_topic: i.topic ?? "",
              p_previous_request_id: i.previousRequestId!,
            }),
          );
        },
        async respond(i) {
          return uuid.parse(
            await rpc("respond_test_request", {
              p_request_id: i.requestId,
              p_revision: i.revision,
              p_action: i.action,
              p_intent_id: i.intentId,
            }),
          );
        },
        async transition(i) {
          return uuid.parse(
            await rpc("transition_test_session", {
              p_session_id: i.sessionId,
              p_revision: i.revision,
              p_action: i.action,
              p_note: i.note,
              p_intent_id: i.intentId,
            }),
          );
        },
      };
    },
  };
}
