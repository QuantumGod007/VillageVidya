import { createClient } from "@supabase/supabase-js";
import { demoCurriculumRepository } from "../../data/curriculum";
import { dataAccessConfigSchema } from "./config";
import type { Database } from "./database.types";
import {
  supabaseCurriculumRepository,
  supabaseLearnerRepository,
} from "./repositories";

// One shared authenticated client for identity and repositories. Demo adapters
// never receive this client or import browser progress into an account.
export function createDataAccess(options: unknown) {
  const config = dataAccessConfigSchema.parse(options);
  if (config.mode === "demo")
    return {
      mode: "demo" as const,
      curriculum: demoCurriculumRepository,
      learner: null,
    };
  const client = createClient<Database>(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      storageKey: "vv-real-auth-v1",
      flowType: "pkce",
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return {
    mode: "supabase" as const,
    client,
    curriculum: supabaseCurriculumRepository(client),
    learner: supabaseLearnerRepository(client),
  };
}
