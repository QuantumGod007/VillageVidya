import { createClient, type Session, type User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { supabaseTutorRepository } from "../src/lib/data-access/tutor-repository";
import type { Database } from "../src/lib/data-access/database.types";
const id = "00000000-0000-0000-0000-000000000003";
function transport(failure?: string, code = "42501") {
  const calls: {
    url: URL;
    header: string | null;
    body: Record<string, unknown> | null;
  }[] = [];
  const client = createClient<Database>(
    "https://fixture.supabase.co",
    "fixture-publishable-only",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: async (input, init) => {
          const request = new Request(input, init),
            url = new URL(request.url),
            table = url.pathname.split("/").at(-1)!;
          calls.push({
            url,
            header: request.headers.get("Authorization"),
            body: request.method === "POST" ? await request.json() : null,
          });
          if (table === failure)
            return new Response(
              JSON.stringify({ code, message: "fixture failure" }),
              { status: 409, headers: { "Content-Type": "application/json" } },
            );
          const value =
            table === "tutor_profiles"
              ? {
                  user_id: id,
                  revision: 1,
                  bio: "",
                  academic_grade: 12,
                  teaching_skill_score: null,
                  completed_sessions: 0,
                }
              : table === "delete_tutor_availability"
                ? true
                : table.startsWith("save_")
                  ? { user_id: id }
                  : [];
          return new Response(JSON.stringify(value), {
            headers: { "Content-Type": "application/json" },
          });
        },
      },
    },
  );
  const user = {
    id,
    aud: "authenticated",
    app_metadata: {},
    user_metadata: {},
  } as User;
  const session = {
    access_token: "owner-token",
    user,
    refresh_token: "fixture",
    token_type: "bearer",
    expires_in: 900,
  } as Session;
  vi.spyOn(client.auth, "getSession").mockResolvedValue({
    data: { session },
    error: null,
  });
  vi.spyOn(client.auth, "getUser").mockResolvedValue({
    data: { user },
    error: null,
  });
  return {
    client,
    calls,
    user,
    session,
    repo: supabaseTutorRepository(client),
  };
}
describe("tutor repository request boundary", () => {
  it("pins requests to the server-verified identity when the shared session changes", async () => {
    const f = transport();
    vi.mocked(f.client.auth.getUser).mockImplementationOnce(async (token) => {
      expect(token).toBe("owner-token");
      vi.mocked(f.client.auth.getSession).mockResolvedValue({
        data: {
          session: {
            ...f.session,
            access_token: "other-account-token",
            user: { ...f.user, id: "other-account" },
          },
        },
        error: null,
      });
      return { data: { user: f.user }, error: null };
    });
    await f.repo.saveBio("Safe biography", 1);
    expect(f.calls.every((c) => c.header === "Bearer owner-token")).toBe(true);
    expect(f.calls[0].url.searchParams.get("user_id")).toBe(`eq.${id}`);
    expect(f.calls[1].body).toEqual({ p_bio: "Safe biography", p_revision: 1 });
  });
  it("scopes all private reads and orders verification by event number", async () => {
    const f = transport();
    await f.repo.load();
    for (const call of f.calls.filter(
      (c) => !c.url.pathname.endsWith("tutor_profiles"),
    ))
      expect(call.url.searchParams.get("tutor_id")).toBe(`eq.${id}`);
    expect(
      f.calls
        .find((c) => c.url.pathname.endsWith("tutor_verification_records"))
        ?.url.searchParams.get("order"),
    ).toBe("event_number.desc");
    expect(f.calls.every((c) => c.header === "Bearer owner-token")).toBe(true);
  });
  it("sends only authorized interval fields and no owner or bookability declaration", async () => {
    const f = transport();
    await f.repo.saveAvailability({
      id: "slot",
      revision: null,
      weekday: 1,
      starts_at: "16:00",
      ends_at: "17:00",
      enabled: true,
    });
    expect(f.calls[1].body).toEqual({
      p_id: "slot",
      p_revision: null,
      p_weekday: 1,
      p_starts_at: "16:00",
      p_ends_at: "17:00",
      p_enabled: true,
    });
    await f.repo.deleteAvailability("slot", 1);
    expect(f.calls.at(-1)?.body).toEqual({ p_id: "slot", p_revision: 1 });
  });
  it.each([
    ["40001", "changed on another device"],
    ["23P01", "overlaps"],
    ["23505", "duplicates"],
    ["23514", "15 minutes"],
    ["42501", "tutor access"],
  ])(
    "does not simulate success for database error %s",
    async (code, message) => {
      const f = transport("save_tutor_bio", code);
      await expect(f.repo.saveBio("bio", 1)).rejects.toThrow(message);
    },
  );
  it("fails closed for missing identity, denied role and partial record reads", async () => {
    const f = transport();
    vi.mocked(f.client.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    await expect(f.repo.load()).rejects.toThrow("signed-in tutor");
    expect(f.calls).toHaveLength(0);
    await expect(transport("tutor_profiles").repo.load()).rejects.toThrow(
      "revoked",
    );
    await expect(transport("tutor_languages").repo.load()).rejects.toThrow(
      "completely",
    );
  });
});
