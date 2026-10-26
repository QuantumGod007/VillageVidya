import { createClient, type Session, type User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "../src/lib/data-access/database.types";
import {
  supabaseTrustRepository,
  trustWorkspaceSchema,
  trustHistorySchema,
  linkedLearnerSchema,
} from "../src/lib/data-access/trust-repository";
function transport(
  value: unknown = "80000000-0000-4000-8000-000000000001",
  code?: string,
) {
  const calls: {
    name: string;
    body: Record<string, unknown>;
    header: string | null;
  }[] = [];
  const client = createClient<Database>(
    "https://fixture.supabase.co",
    "fixture-publishable-only",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: crypto.randomUUID(),
      },
      global: {
        fetch: async (input, init) => {
          const req = new Request(input, init);
          calls.push({
            name: new URL(req.url).pathname.split("/").at(-1)!,
            body: await req.json(),
            header: req.headers.get("Authorization"),
          });
          return new Response(
            JSON.stringify(code ? { code, message: "fixture failure" } : value),
            {
              status: code ? 409 : 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        },
      },
    },
  );
  const user = { id: "80000000-0000-4000-8000-000000000001" } as User;
  const session = { access_token: "verified-token", user } as Session;
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
    session,
    user,
    calls,
    repo: supabaseTrustRepository(client),
  };
}
describe("trust repository HTTP request boundary", () => {
  it("pins the verified bearer despite a shared-client account change and never sends a reviewer claim", async () => {
    const f = transport();
    vi.mocked(f.client.auth.getUser).mockImplementationOnce(async (token) => {
      expect(token).toBe("verified-token");
      vi.mocked(f.client.auth.getSession).mockResolvedValue({
        data: { session: { ...f.session, access_token: "different-token" } },
        error: null,
      });
      return { data: { user: f.user }, error: null };
    });
    await f.repo.reviewTutor({
      tutorId: f.user.id,
      token: "opaque-evidence-token",
      status: "approved",
      grade: 8,
      reason: "Synthetic decision reason.",
      requestId: f.user.id,
    });
    expect(f.calls).toEqual([
      {
        name: "review_test_tutor",
        header: "Bearer verified-token",
        body: {
          p_tutor_id: f.user.id,
          p_token: "opaque-evidence-token",
          p_status: "approved",
          p_grade: 8,
          p_reason: "Synthetic decision reason.",
          p_request_id: f.user.id,
        },
      },
    ]);
  });
  it("transports only explicit revision/event/intent fields for relationship, consent and safety", async () => {
    const f = transport();
    const id = f.user.id;
    await f.repo.relationship({
      guardianId: id,
      learnerId: id,
      revision: 0,
      status: "approved",
      reason: "Synthetic link reason.",
      requestId: id,
    });
    await f.repo.consent({
      relationshipId: id,
      expectedEvent: 7,
      grant: false,
      reason: "Synthetic withdrawal reason.",
      requestId: id,
    });
    await f.repo.reviewReport({
      reportId: id,
      revision: 2,
      status: "resolved",
      note: "Private synthetic review.",
      requestId: id,
    });
    expect(
      await f.repo.submitReport({
        submissionId: id,
        category: "content",
        summary: "Synthetic scenario only.",
      }),
    ).toBe(id);
    expect(f.calls.map((c) => c.name)).toEqual([
      "review_test_relationship",
      "record_test_consent",
      "review_test_safety_report",
      "submit_test_safety_report",
    ]);
    expect(f.calls[1].body).toEqual({
      p_relationship_id: id,
      p_expected_event: 7,
      p_grant: false,
      p_reason: "Synthetic withdrawal reason.",
      p_request_id: id,
    });
    expect(
      f.calls.every(
        (c) =>
          c.header === "Bearer verified-token" &&
          !("p_actor_id" in c.body) &&
          !("p_role" in c.body),
      ),
    ).toBe(true);
  });
  it.each(["40001", "22023", "42501"])(
    "fails closed on %s without claiming success",
    async (code) => {
      const f = transport(null, code);
      await expect(
        f.repo.submitReport({
          submissionId: f.user.id,
          category: "other",
          summary: "Synthetic report.",
        }),
      ).rejects.toThrow(
        code === "40001"
          ? "record changed"
          : code === "22023"
            ? "transition"
            : "role/session",
      );
    },
  );
  it("makes no request after session expiry", async () => {
    const f = transport();
    vi.mocked(f.client.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    await expect(f.repo.load()).rejects.toThrow("signed-in");
    expect(f.calls).toHaveLength(0);
  });
  it("rejects missing, oversized and private-field-bearing server projections", () => {
    expect(trustWorkspaceSchema.safeParse({ test_only: false }).success).toBe(
      false,
    );
    expect(
      trustHistorySchema.safeParse({
        records: Array(21).fill({}),
        more: true,
        next_before: 2,
      }).success,
    ).toBe(false);
    expect(
      linkedLearnerSchema.safeParse({
        test_only: true,
        as_of: "2026-10-25T00:00:00Z",
        display_name: "Adult",
        language: "English",
        enrollments: [],
        progress: [],
        email: "private@example.invalid",
      }).success,
    ).toBe(false);
  });
});
