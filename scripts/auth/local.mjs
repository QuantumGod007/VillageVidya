import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
export function localConfig() {
  // Never print CLI status: it contains the local server key.
  const status = JSON.parse(
    execFileSync("node_modules/.bin/supabase", ["status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  const url = status.API_URL;
  const databaseUrl = status.DB_URL;
  for (const value of [url, databaseUrl]) {
    if (
      !value ||
      !["127.0.0.1", "localhost", "[::1]"].includes(new URL(value).hostname)
    )
      throw new Error(
        "Authentication tooling only operates on the local Supabase stack.",
      );
  }
  if (!status.SERVICE_ROLE_KEY || !status.ANON_KEY)
    throw new Error("Local API/Auth is unavailable. Run npm run auth:start.");
  return {
    url,
    databaseUrl,
    serverKey: status.SERVICE_ROLE_KEY,
    publicKey: status.ANON_KEY,
  };
}
export const transientClient = (url, key) =>
  createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
