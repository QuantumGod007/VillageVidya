import { describe, it, expect, vi } from "vitest";
import { createClient, type User } from "@supabase/supabase-js";
import { curriculum } from "../src/data/curriculum";
import { createDataAccess } from "../src/lib/data-access";
import { dataAccessConfigSchema } from "../src/lib/data-access/config";
import {
  supabaseCurriculumRepository,
  supabaseLearnerRepository,
} from "../src/lib/data-access/repositories";
import type { Database } from "../src/lib/data-access/database.types";
const anonKey = "sb_publishable_fixture_public_key_only";
const id = "00000000-0000-0000-0000-000000000001";
function rows() {
  const c = curriculum;
  return {
    academic_boards: c.boards,
    academic_grades: c.grades.map((g) => ({
      id: g.id,
      board_id: g.boardId,
      number: g.number,
    })),
    academic_subjects: c.subjects.map((s) => ({
      id: s.id,
      grade_id: s.gradeId,
      name: s.name,
    })),
    chapters: c.chapters.map((ch) => ({
      id: ch.id,
      subject_id: ch.subjectId,
      title: ch.title,
      position: ch.order,
      kind: ch.kind,
      source_id: ch.source ? `source-${ch.id}` : null,
    })),
    lessons: c.lessons.map((l, i) => ({
      id: l.id,
      chapter_id: l.chapterId,
      language: l.language,
      title: l.title,
      subtitle: l.subtitle,
      minutes: l.minutes,
      concept: l.concept,
      steps: l.steps,
      example: l.example,
      keywords: l.keywords,
      position: i + 1,
      content_origin: "original_practice",
    })),
    assessments: c.assessments.map((a) => ({
      id: a.id,
      lesson_id: a.lessonId,
      question: a.question,
      options: a.options,
      answer_index: a.answer,
      explanation: a.explanation,
    })),
    curriculum_sources: c.chapters
      .filter((ch) => ch.source)
      .map((ch) => ({
        id: `source-${ch.id}`,
        title: ch.source!.title,
        url: ch.source!.url,
        edition: ch.source!.edition,
        verified_on: ch.source!.verifiedOn,
      })),
  };
}
function mockClient(data: Record<string, unknown> = rows(), failure?: string) {
  const calls: {
    url: URL;
    method: string;
    body: unknown;
    prefer: string | null;
  }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const request = new Request(input, init),
      url = new URL(request.url),
      table = url.pathname.split("/").at(-1)!;
    calls.push({
      url,
      method: request.method,
      body: request.method === "POST" ? await request.json() : null,
      prefer: request.headers.get("prefer"),
    });
    if (table === failure)
      return new Response(
        JSON.stringify({ code: "42501", message: "denied" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    if (request.method === "GET")
      return new Response(JSON.stringify(data[table] ?? []), {
        headers: { "Content-Type": "application/json" },
      });
    return new Response(null, { status: 204 });
  };
  const client = createClient<Database>(
    "https://fixture.supabase.co",
    anonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: fetcher },
    },
  );
  return { client, calls };
}
function signedIn(client: ReturnType<typeof mockClient>["client"]) {
  const user: User = {
    id,
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
    app_metadata: {},
    user_metadata: {},
  };
  vi.spyOn(client.auth, "getUser").mockResolvedValue({
    data: { user },
    error: null,
  });
}
describe("explicit backend modes and client configuration", () => {
  it("keeps demo mode even if backend configuration is present", async () => {
    const result = createDataAccess({
      mode: "demo",
      url: "https://fixture.supabase.co",
      publishableKey: anonKey,
    });
    expect(result.mode).toBe("demo");
    expect(result.learner).toBeNull();
    expect(await result.curriculum.load()).toEqual(curriculum);
    expect(localStorage.length).toBe(0);
  });
  it("requires an explicit valid mode and rejects service credentials and nonlocal HTTP", () => {
    expect(
      dataAccessConfigSchema.safeParse({
        url: "https://fixture.supabase.co",
        publishableKey: anonKey,
      }).success,
    ).toBe(false);
    const serviceJwt = `x.${btoa(JSON.stringify({ role: "service_role" }))}.x`;
    for (const key of ["sb_secret_not_for_browser", serviceJwt, "invalid"])
      expect(
        dataAccessConfigSchema.safeParse({
          mode: "supabase",
          url: "https://fixture.supabase.co",
          publishableKey: key,
        }).success,
      ).toBe(false);
    for (const url of [
      "http://example.com",
      "https://secret:password@example.com",
      "file:///private/data",
    ])
      expect(
        dataAccessConfigSchema.safeParse({
          mode: "supabase",
          url,
          publishableKey: anonKey,
        }).success,
      ).toBe(false);
    expect(
      dataAccessConfigSchema.safeParse({
        mode: "supabase",
        url: "http://127.0.0.1:54321",
        publishableKey: anonKey,
      }).success,
    ).toBe(true);
  });
  it("constructs the dormant adapter without importing or changing demo records", () => {
    localStorage.setItem(
      "village-vidya-fictional-demo-v1",
      JSON.stringify({ progress: { equations: 100 } }),
    );
    expect(
      createDataAccess({
        mode: "supabase",
        url: "https://fixture.supabase.co",
        publishableKey: anonKey,
      }).mode,
    ).toBe("supabase");
    expect(
      JSON.parse(localStorage.getItem("village-vidya-fictional-demo-v1")!)
        .progress.equations,
    ).toBe(100);
  });
});
describe("typed Supabase repository behavior (HTTP unit fixtures, not RLS proof)", () => {
  it("maps normalized curriculum and source metadata to the existing domain", async () => {
    const { client } = mockClient();
    expect(await supabaseCurriculumRepository(client).load()).toEqual(
      curriculum,
    );
  });
  it("propagates read errors instead of falling back to fictional data", async () => {
    const { client } = mockClient(rows(), "lessons");
    await expect(supabaseCurriculumRepository(client).load()).rejects.toThrow(
      "read lessons",
    );
  });
  it("rejects incomplete published academic paths", async () => {
    const data = rows();
    data.assessments = [];
    await expect(
      supabaseCurriculumRepository(mockClient(data).client).load(),
    ).rejects.toThrow("incomplete academic path");
  });
  it("requires a server-validated signed-in identity for private operations", async () => {
    const { client, calls } = mockClient();
    await expect(supabaseLearnerRepository(client).progress()).rejects.toThrow(
      "signed-in identity",
    );
    expect(calls).toHaveLength(0);
  });
  it("scopes private reads and idempotent bookmark writes to the authenticated UUID", async () => {
    const { client, calls } = mockClient({
      lesson_progress: [
        { learner_id: id, lesson_id: "equations", checkpoint_percent: 25 },
      ],
    });
    signedIn(client);
    const repository = supabaseLearnerRepository(client);
    expect(await repository.progress()).toEqual([
      { learner_id: id, lesson_id: "equations", checkpoint_percent: 25 },
    ]);
    await repository.setBookmark("equations", true);
    await repository.setBookmark("equations", false);
    await repository.enroll("cbse-8-mathematics", "English");
    expect(calls[0].url.searchParams.get("learner_id")).toBe(`eq.${id}`);
    expect(calls[1].body).toEqual({ learner_id: id, lesson_id: "equations" });
    expect(calls[1].prefer).toContain("resolution=ignore-duplicates");
    expect(calls[2].url.searchParams.get("learner_id")).toBe(`eq.${id}`);
    expect(calls[2].url.searchParams.get("lesson_id")).toBe("eq.equations");
    expect(calls[3].body).toEqual({
      learner_id: id,
      subject_id: "cbse-8-mathematics",
      language: "English",
    });
  });
  it("does not turn denied writes into a simulated success", async () => {
    const { client } = mockClient({}, "learner_bookmarks");
    signedIn(client);
    await expect(
      supabaseLearnerRepository(client).setBookmark("equations", true),
    ).rejects.toThrow("Could not change");
  });
});
