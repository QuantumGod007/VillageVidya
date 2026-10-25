import { createClient, type Session, type User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "../src/lib/data-access/database.types";
import {
  supabaseDiscoveryRepository,
  type DiscoveryFilters,
} from "../src/lib/data-access/discovery-repository";
import { discoveryResult } from "./helpers/discovery-fixture";
const filters: DiscoveryFilters = {
  subjectId: "cbse-8-mathematics",
  language: "English",
  query: "",
  weekday: null,
  startsAt: null,
  endsAt: null,
  preferenceOnly: false,
};
function fixture(response: unknown = discoveryResult(), error?: string) {
  const calls: { header: string | null; url: URL; body: unknown }[] = [];
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
          const request = new Request(input, init);
          calls.push({
            header: request.headers.get("Authorization"),
            url: new URL(request.url),
            body: await request.json(),
          });
          return new Response(
            JSON.stringify(
              error ? { code: error, message: "database denial" } : response,
            ),
            {
              status: error ? 403 : 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        },
      },
    },
  );
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    app_metadata: {},
    user_metadata: {},
  } as User;
  const session = {
    access_token: "verified-learner-token",
    refresh_token: "test",
    user,
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
    repo: supabaseDiscoveryRepository(client),
  };
}
describe("discovery typed repository and privacy projection validation", () => {
  it("pins the single RPC to verified identity during an account change", async () => {
    const f = fixture();
    vi.mocked(f.client.auth.getUser).mockImplementationOnce(async (token) => {
      expect(token).toBe("verified-learner-token");
      vi.mocked(f.client.auth.getSession).mockResolvedValue({
        data: {
          session: { ...f.session, access_token: "another-account-token" },
        },
        error: null,
      });
      return { data: { user: f.user }, error: null };
    });
    await f.repo.search(filters);
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0].header).toBe("Bearer verified-learner-token");
    expect(f.calls[0].url.pathname).toBe("/rest/v1/rpc/discover_test_tutors");
    expect(f.calls[0].body).toEqual({
      p_subject_id: "cbse-8-mathematics",
      p_language: "English",
      p_query: "",
      p_weekday: null,
      p_starts_at: null,
      p_ends_at: null,
      p_preference_only: false,
    });
  });
  it("forwards explicit weekly filters without owner, score or eligibility parameters", async () => {
    const f = fixture();
    await f.repo.search({
      ...filters,
      query: "91000000",
      weekday: 1,
      startsAt: "16:00",
      endsAt: "17:00",
      preferenceOnly: true,
    });
    expect(f.calls[0].body).toEqual({
      p_subject_id: filters.subjectId,
      p_language: filters.language,
      p_query: "91000000",
      p_weekday: 1,
      p_starts_at: "16:00",
      p_ends_at: "17:00",
      p_preference_only: true,
    });
  });
  it("requires an active verified session before making requests", async () => {
    const f = fixture();
    vi.mocked(f.client.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    await expect(f.repo.search(filters)).rejects.toThrow("Sign in");
    expect(f.calls).toHaveLength(0);
  });
  it.each(["42501", "22023"])(
    "propagates database error %s rather than inventing matches",
    async (code) => {
      await expect(
        fixture(undefined, code).repo.search(filters),
      ).rejects.toThrow(
        code === "22023" ? "published subject" : "learner access",
      );
    },
  );
  it.each(["email", "bio", "tutor_id", "starts_at", "decision_note"])(
    "rejects unexpected private field %s",
    async (field) => {
      const result = discoveryResult();
      const value = {
        ...result,
        candidates: [{ ...result.candidates[0], [field]: "unexpected" }],
      };
      await expect(fixture(value).repo.search(filters)).rejects.toThrow();
    },
  );
  it("rejects non-test responses, invalid score claims and mismatched contexts", async () => {
    await expect(
      fixture({ ...discoveryResult(), test_only: false }).repo.search(filters),
    ).rejects.toThrow();
    const result = discoveryResult();
    await expect(
      fixture({
        ...result,
        candidates: [{ ...result.candidates[0], teaching_skill_score: 49 }],
      }).repo.search(filters),
    ).rejects.toThrow();
    await expect(
      fixture({
        ...result,
        context: { ...result.context, subject_id: "cbse-6-mathematics" },
      }).repo.search(filters),
    ).rejects.toThrow("context changed");
  });
});
