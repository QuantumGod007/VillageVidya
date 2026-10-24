import { z } from "zod";

function isPublishableKey(key: string) {
  if (key.startsWith("sb_publishable_") && key.length > 20) return true;
  // Legacy anon JWTs are public keys; never accept the privileged service JWT.
  try {
    const payload = key.split(".")[1];
    const claims = JSON.parse(
      atob(payload.replaceAll("-", "+").replaceAll("_", "/")),
    );
    return claims.role === "anon";
  } catch {
    return false;
  }
}
const publicUrl = z.url().refine((value) => {
  const url = new URL(value);
  return (
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    (url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
  );
}, "Use an HTTPS Supabase URL, or HTTP loopback for local development.");
export const dataAccessConfigSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("demo") }),
  z.object({
    mode: z.literal("supabase"),
    url: publicUrl,
    publishableKey: z
      .string()
      .refine(
        isPublishableKey,
        "Only publishable or legacy anon keys are allowed in client configuration.",
      ),
  }),
]);
