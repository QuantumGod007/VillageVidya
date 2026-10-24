import { createClient } from "@supabase/supabase-js";
import { demoCurriculumRepository } from "../../data/curriculum";
import { dataAccessConfigSchema } from "./config";
import type { Database } from "./database.types";
import {
  supabaseCurriculumRepository,
  supabaseLearnerRepository,
} from "./repositories";

// Deliberately not called by the current demo UI. Neither environment variables
// nor a fictional role can enable a production account or import local progress.
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
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return {
    mode: "supabase" as const,
    curriculum: supabaseCurriculumRepository(client),
    learner: supabaseLearnerRepository(client),
  };
}
