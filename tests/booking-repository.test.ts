import { createClient, type Session, type User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  supabaseBookingRepository,
  bookingSchema,
} from "../src/lib/data-access/booking-repository";
import type { Database } from "../src/lib/data-access/database.types";
import { istSchedule } from "../src/domain/test-booking";
const id = "a2000000-0000-4000-8000-000000000001",
  other = "a2000000-0000-4000-8000-000000000002";
function transport(code?: string) {
  const calls: {
    name: string;
    body: Record<string, unknown>;
    header: string | null;
  }[] = [];
  const client = createClient<Database>(
    "https://fixture.supabase.co",
    "fixture-public-only",
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
            JSON.stringify(
              code ? { code, message: "private internal error" } : id,
            ),
            {
              status: code ? 409 : 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        },
      },
    },
  );
  const user = { id } as User,
    session = { user, access_token: "actor-A-token" } as Session;
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
    repo: supabaseBookingRepository(client).forActor(id),
  };
}
describe("booking HTTP identity boundary", () => {
  it("pins the verified actor bearer and sends opaque target/intent fields only", async () => {
    const f = transport();
    await f.repo.request({
      previewId: other,
      subjectId: "cbse-8-mathematics",
      language: "English",
      startsAt: "2026-10-27T10:30:00Z",
      durationMinutes: 15,
      intentId: id,
    });
    expect(f.calls).toEqual([
      {
        name: "request_test_tutor",
        header: "Bearer actor-A-token",
        body: {
          p_intent_id: id,
          p_preview_id: other,
          p_subject_id: "cbse-8-mathematics",
          p_language: "English",
          p_starts_at: "2026-10-27T10:30:00Z",
          p_duration_minutes: 15,
          p_topic: "",
        },
      },
    ]);
  });
  it("refuses an account change before a queued mutation starts", async () => {
    const f = transport();
    vi.mocked(f.client.auth.getSession).mockResolvedValue({
      data: { session: { ...f.session, user: { ...f.user, id: other } } },
      error: null,
    });
    await expect(
      f.repo.respond({
        requestId: id,
        revision: 1,
        action: "accept",
        intentId: other,
      }),
    ).rejects.toThrow("account changed");
    expect(f.calls).toHaveLength(0);
  });
  it("refuses a switch while server identity verification is pending", async () => {
    const f = transport();
    vi.mocked(f.client.auth.getUser).mockImplementationOnce(async () => {
      vi.mocked(f.client.auth.getSession).mockResolvedValue({
        data: { session: { ...f.session, user: { ...f.user, id: other } } },
        error: null,
      });
      return { data: { user: f.user }, error: null };
    });
    await expect(
      f.repo.transition({
        sessionId: id,
        revision: 2,
        action: "complete",
        note: "",
        intentId: other,
      }),
    ).rejects.toThrow("action was not sent");
    expect(f.calls).toHaveLength(0);
  });
  it.each([
    ["40001", "record changed"],
    ["23P01", "already reserved"],
    ["42501", "adult-test access"],
    ["22023", "deadline"],
  ])(
    "maps %s without exposing private database messages",
    async (code, message) => {
      const f = transport(code);
      await expect(
        f.repo.respond({
          requestId: id,
          revision: 1,
          action: "accept",
          intentId: other,
        }),
      ).rejects.toThrow(message);
    },
  );
  it("rejects private or unlabelled fields in a booking projection", () => {
    const empty = {
      test_only: true,
      as_of: "2026-10-26T12:00:00Z",
      requests: [],
      sessions: [],
      more: false,
    };
    expect(bookingSchema.safeParse(empty).success).toBe(true);
    expect(
      bookingSchema.safeParse({
        ...empty,
        private_email: "never@example.invalid",
      }).success,
    ).toBe(false);
    expect(
      bookingSchema.safeParse({ ...empty, test_only: false }).success,
    ).toBe(false);
  });
});
describe("explicit IST schedule conversion", () => {
  it("stores UTC across the local date boundary", () => {
    expect(istSchedule("2026-10-27", "00:15")).toBe("2026-10-26T18:45:00.000Z");
  });
  it.each([
    ["2026-02-30", "16:00"],
    ["2026-10-27", "25:00"],
    ["", "16:00"],
  ])("rejects invalid calendar/time input", (date, time) => {
    expect(() => istSchedule(date, time)).toThrow();
  });
});
