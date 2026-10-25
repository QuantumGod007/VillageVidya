import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "./database.types";
import type { Language } from "../../domain/types";
const passedReasons = [
  "adult_test_access",
  "preview_opt_in",
  "latest_test_approval",
  "verified_grade_sufficient",
  "exact_subject_qualification",
  "qualified_language",
  "tss_floor_met",
] as const;
export const discoverySchema = z
  .object({
    test_only: z.literal(true),
    as_of: z.string().datetime({ offset: true }),
    expires_at: z.string().datetime({ offset: true }),
    context: z
      .object({
        subject_id: z.string(),
        board_id: z.string(),
        grade: z.number().int().min(4).max(10),
        subject: z.string(),
        language: z.enum(["English", "हिन्दी", "मराठी", "తెలుగు"]),
      })
      .strict(),
    availability_basis: z.enum(["current_ist_time", "requested_weekly_window"]),
    more_available: z.boolean(),
    candidates: z
      .array(
        z
          .object({
            preview_id: z.string().uuid(),
            label: z.string().regex(/^Test tutor [a-f0-9]{8}$/),
            eligible: z.literal(true),
            verified_grade: z.number().int().min(4).max(12),
            teaching_skill_score: z.number().min(50).max(100),
            cms: z.number().min(75).max(100),
            factors: z
              .object({
                subject: z.literal(1),
                language: z.literal(1),
                teaching: z.number().min(0.5).max(1),
                availability: z.union([z.literal(0), z.literal(1)]),
              })
              .strict(),
            reasons: z.array(z.enum(passedReasons)).length(7),
            has_weekly_preference: z.boolean(),
            preference_matches: z.boolean(),
          })
          .strict(),
      )
      .max(24),
  })
  .strict();
export type DiscoveryResult = z.infer<typeof discoverySchema>;
export interface DiscoveryFilters {
  subjectId: string;
  language: Language;
  query: string;
  weekday: number | null;
  startsAt: string | null;
  endsAt: string | null;
  preferenceOnly: boolean;
}
export interface DiscoveryRepository {
  search(filters: DiscoveryFilters): Promise<DiscoveryResult>;
}
export function supabaseDiscoveryRepository(
  client: SupabaseClient<Database>,
): DiscoveryRepository {
  return {
    async search(filters) {
      const session = await client.auth.getSession();
      const token = session.data.session?.access_token;
      if (session.error || !token)
        throw new Error(
          "Sign in with an adult learner test account to search.",
        );
      const user = await client.auth.getUser(token);
      if (user.error || !user.data.user)
        throw new Error("Your session ended. Sign in again.");
      // Authorization is repeated inside the RPC. Pin this read to the verified
      // session so switching accounts cannot redirect a pending search.
      const result = await client
        .rpc("discover_test_tutors", {
          p_subject_id: filters.subjectId,
          p_language: filters.language,
          p_query: filters.query,
          p_weekday: filters.weekday!,
          p_starts_at: filters.startsAt!,
          p_ends_at: filters.endsAt!,
          p_preference_only: filters.preferenceOnly,
        })
        .setHeader("Authorization", `Bearer ${token}`);
      if (result.error)
        throw new Error(
          result.error.code === "22023"
            ? "Choose a published subject and a complete time window of 15 minutes to 4 hours."
            : "Discovery could not verify your learner access or reach the server. Check your connection and sign in again if needed.",
        );
      const data = discoverySchema.parse(result.data);
      if (
        data.context.subject_id !== filters.subjectId ||
        data.context.language !== filters.language
      )
        throw new Error("The result context changed. Refresh your search.");
      return data;
    },
  };
}
