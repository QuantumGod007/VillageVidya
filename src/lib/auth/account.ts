import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "../data-access/database.types";
import type { Role } from "../../domain/types";
export interface AccountIdentity {
  id: string;
  email: string;
  profile: Tables<"profiles">;
  roles: Role[];
  learner: Tables<"learner_profiles"> | null;
  tutor: Tables<"tutor_profiles"> | null;
  relationships: Tables<"guardian_relationships">[];
}
export async function verifiedAccount(
  client: SupabaseClient<Database>,
): Promise<AccountIdentity> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || !data.user.email_confirmed_at)
    throw new Error(
      "Your session is invalid or your email is not confirmed. Sign in again.",
    );
  const id = data.user.id;
  const [profile, roles, access, learner, tutor, relationships] =
    await Promise.all([
      client.from("profiles").select("*").eq("id", id).single(),
      client.from("user_roles").select("role").eq("user_id", id),
      client
        .from("adult_test_accounts")
        .select("enabled")
        .eq("user_id", id)
        .single(),
      client
        .from("learner_profiles")
        .select("*")
        .eq("user_id", id)
        .maybeSingle(),
      client.from("tutor_profiles").select("*").eq("user_id", id).maybeSingle(),
      client.from("guardian_relationships").select("*"),
    ]);
  if (
    [profile, roles, access, learner, tutor, relationships].some(
      (r) => r.error,
    ) ||
    !profile.data ||
    !access.data?.enabled ||
    !roles.data?.length
  )
    throw new Error(
      "Account access is unavailable or has been revoked. Only provisioned adult test accounts can enter.",
    );
  const assigned = roles.data.map((r) => r.role);
  if (
    (assigned.includes("learner") && !learner.data) ||
    (assigned.includes("tutor") && !tutor.data)
  )
    throw new Error(
      "Your role profile is incomplete. Contact the account administrator.",
    );
  return {
    id,
    email: data.user.email ?? "",
    profile: profile.data,
    roles: assigned,
    learner: learner.data,
    tutor: tutor.data,
    relationships: relationships.data ?? [],
  };
}
