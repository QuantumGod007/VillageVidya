import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "./database.types";
export interface TutorSnapshot {
  profile: Tables<"tutor_profiles">;
  availability: Tables<"tutor_availability">[];
  subjects: Tables<"tutor_subject_qualifications">[];
  languages: Tables<"tutor_languages">[];
  verification: Tables<"tutor_verification_records">[];
}
export interface AvailabilityInput {
  id: string;
  revision: number | null;
  weekday: number;
  starts_at: string;
  ends_at: string;
  enabled: boolean;
}
export interface TutorRepository {
  load(): Promise<TutorSnapshot>;
  saveBio(bio: string, revision: number): Promise<void>;
  saveAvailability(input: AvailabilityInput): Promise<void>;
  deleteAvailability(id: string, revision: number): Promise<void>;
}
function fail(error: { code?: string } | null) {
  if (!error) return;
  const message =
    error.code === "40001"
      ? "This record changed on another device. Refresh records before editing again."
      : error.code === "23P01" || error.code === "23505"
        ? "This interval overlaps or duplicates a saved interval, including disabled intervals."
        : error.code === "23514" || error.code === "22023"
          ? "Use intervals of 15 minutes to 4 hours, with start before end, and at most 4 per day."
          : "The change could not be saved. Check your connection and tutor access, then refresh.";
  throw new Error(message);
}
export function supabaseTutorRepository(
  client: SupabaseClient<Database>,
): TutorRepository {
  async function identity() {
    const session = await client.auth.getSession();
    const token = session.data.session?.access_token;
    if (session.error || !token)
      throw new Error("A verified signed-in tutor identity is required.");
    const user = await client.auth.getUser(token);
    if (user.error || !user.data.user)
      throw new Error("Your session ended. Sign in again.");
    const id = user.data.user.id;
    const header = `Bearer ${token}`;
    const profile = await client
      .from("tutor_profiles")
      .select("*")
      .eq("user_id", id)
      .setHeader("Authorization", header)
      .single();
    if (profile.error || !profile.data)
      throw new Error("Tutor access is unavailable or revoked. Sign in again.");
    return { id, header, profile: profile.data };
  }
  return {
    async load() {
      const owner = await identity();
      const [availability, subjects, languages, verification] =
        await Promise.all([
          client
            .from("tutor_availability")
            .select("*")
            .eq("tutor_id", owner.id)
            .order("weekday")
            .order("starts_at")
            .setHeader("Authorization", owner.header),
          client
            .from("tutor_subject_qualifications")
            .select("*")
            .eq("tutor_id", owner.id)
            .order("subject_id")
            .setHeader("Authorization", owner.header),
          client
            .from("tutor_languages")
            .select("*")
            .eq("tutor_id", owner.id)
            .order("language")
            .setHeader("Authorization", owner.header),
          client
            .from("tutor_verification_records")
            .select("*")
            .eq("tutor_id", owner.id)
            .order("event_number", { ascending: false })
            .limit(1000)
            .setHeader("Authorization", owner.header),
        ]);
      const results = [availability, subjects, languages, verification];
      if (results.some((r) => r.error || !r.data || r.data.length >= 1000))
        throw new Error(
          "Tutor records could not be loaded completely. Check your connection and access.",
        );
      return {
        profile: owner.profile,
        availability: availability.data!,
        subjects: subjects.data!,
        languages: languages.data!,
        verification: verification.data!,
      };
    },
    async saveBio(p_bio, p_revision) {
      const owner = await identity();
      const result = await client
        .rpc("save_tutor_bio", { p_bio, p_revision })
        .setHeader("Authorization", owner.header);
      fail(result.error);
      if (!result.data)
        throw new Error(
          "Biography save could not be confirmed. Refresh records.",
        );
    },
    async saveAvailability(input) {
      const owner = await identity();
      const result = await client
        .rpc("save_tutor_availability", {
          p_id: input.id,
          p_revision: input.revision!,
          p_weekday: input.weekday,
          p_starts_at: input.starts_at,
          p_ends_at: input.ends_at,
          p_enabled: input.enabled,
        })
        .setHeader("Authorization", owner.header);
      fail(result.error);
      if (!result.data)
        throw new Error(
          "Availability save could not be confirmed. Refresh records.",
        );
    },
    async deleteAvailability(p_id, p_revision) {
      const owner = await identity();
      const result = await client
        .rpc("delete_tutor_availability", { p_id, p_revision })
        .setHeader("Authorization", owner.header);
      fail(result.error);
      if (result.data !== true)
        throw new Error("Removal could not be confirmed. Refresh records.");
    },
  };
}
