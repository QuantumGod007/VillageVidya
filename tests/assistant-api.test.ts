import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  assistantHttpResponse,
  createAssistantService,
  geminiProvider,
  type AssistantEnvironment,
  type AssistantProvider,
} from "../server/assistant";

const answer = {
  title: "Fractions as equal pieces",
  explanation: "A half is the same amount as two quarters.",
  steps: ["Change one half into two quarters.", "Add one more quarter."],
  example: "Think of a roti cut into four equal pieces.",
  followUp: "Can you name how many quarters make one whole?",
};

function environment(
  changes: Partial<AssistantEnvironment> = {},
): AssistantEnvironment {
  return {
    apiKey: "test-server-key",
    model: "test-model",
    demoEnabled: true,
    hosted: false,
    nodeEnv: "development",
    supabaseUrl: "",
    supabasePublishableKey: "",
    ...changes,
  };
}

const request = {
  question: "Help me understand fractions",
  context: {
    boardId: "cbse" as const,
    grade: 6 as const,
    subject: "Mathematics" as const,
    language: "English" as const,
  },
  lessonId: "fractions",
};

describe("AI learning assistant API", () => {
  it("returns a generated answer with redacted input and the selected context", async () => {
    const provider = vi.fn<AssistantProvider>().mockResolvedValue(answer);
    const service = createAssistantService({ environment: environment(), provider });
    const result = await service.answer({
      ...request,
      question: "Call 9876543210 and help me understand fractions",
    });
    expect(result).toEqual({ ok: true, answer, lessonId: "fractions" });
    expect(provider).toHaveBeenCalledWith(
      expect.objectContaining({
        question: "Call [contact removed] and help me understand fractions",
        context: request.context,
        lesson: expect.objectContaining({ id: "fractions" }),
      }),
    );
  });

  it("does not call a provider when local AI is disabled or the key is missing", async () => {
    const provider = vi.fn<AssistantProvider>().mockResolvedValue(answer);
    const disabled = createAssistantService({
      environment: environment({ demoEnabled: false }),
      provider,
    });
    await expect(disabled.answer(request)).resolves.toEqual({
      ok: false,
      failure: "not_configured",
    });
    const missingKey = createAssistantService({
      environment: environment({ apiKey: "" }),
      provider,
    });
    await expect(missingKey.answer(request)).resolves.toEqual({
      ok: false,
      failure: "not_configured",
    });
    expect(provider).not.toHaveBeenCalled();
  });

  it("rejects oversized or malformed requests before any provider call", async () => {
    const provider = vi.fn<AssistantProvider>().mockResolvedValue(answer);
    const service = createAssistantService({ environment: environment(), provider });
    await expect(
      service.answer({ ...request, question: "x".repeat(1201) }),
    ).resolves.toEqual({ ok: false, failure: "invalid_request" });
    await expect(service.answer({ question: "fractions" })).resolves.toEqual({
      ok: false,
      failure: "invalid_request",
    });
    expect(provider).not.toHaveBeenCalled();
  });

  it("fails safely for invalid provider output and provider outages", async () => {
    const invalid = createAssistantService({
      environment: environment(),
      provider: (async () => ({ title: "not enough" })) as unknown as AssistantProvider,
    });
    await expect(invalid.answer(request)).resolves.toEqual({
      ok: false,
      failure: "unavailable",
    });
    const failed = createAssistantService({
      environment: environment(),
      provider: (async () => {
        throw new Error("provider outage");
      }) as AssistantProvider,
    });
    await expect(failed.answer(request)).resolves.toEqual({
      ok: false,
      failure: "unavailable",
    });
  });

  it("enforces a short in-memory rate limit without retaining prompts", async () => {
    const provider = vi.fn<AssistantProvider>().mockResolvedValue(answer);
    const service = createAssistantService({ environment: environment(), provider });
    for (let count = 0; count < 8; count += 1)
      await expect(service.answer(request)).resolves.toMatchObject({ ok: true });
    await expect(service.answer(request)).resolves.toEqual({
      ok: false,
      failure: "rate_limited",
    });
    expect(provider).toHaveBeenCalledTimes(8);
  });

  it("never lets the demo flag bypass production account authorization", async () => {
    const authorizer = vi.fn().mockResolvedValue({ ok: false });
    const provider = vi.fn<AssistantProvider>().mockResolvedValue(answer);
    const service = createAssistantService({
      environment: environment({ hosted: true, nodeEnv: "production" }),
      provider,
      authorizer,
    });
    await expect(service.answer(request)).resolves.toEqual({
      ok: false,
      failure: "unauthorized",
    });
    expect(authorizer).toHaveBeenCalledWith(undefined, request.context);
    expect(provider).not.toHaveBeenCalled();
  });

  it("permits only a server-authorized adult learner or tutor request in production", async () => {
    const authorizer = vi.fn().mockResolvedValue({
      ok: true,
      rateKey: "account:test-adult",
    });
    const provider = vi.fn<AssistantProvider>().mockResolvedValue(answer);
    const service = createAssistantService({
      environment: environment({ hosted: true, nodeEnv: "production" }),
      provider,
      authorizer,
    });
    await expect(
      service.answer(request, "Bearer an-untrusted-browser-token"),
    ).resolves.toEqual({ ok: true, answer, lessonId: "fractions" });
    expect(authorizer).toHaveBeenCalledWith(
      "Bearer an-untrusted-browser-token",
      request.context,
    );
  });

  it("maps provider quota responses to a safe rate-limit response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    const service = createAssistantService({
      environment: environment(),
      provider: geminiProvider(environment()),
    });
    await expect(service.answer(request)).resolves.toEqual({
      ok: false,
      failure: "rate_limited",
    });
    vi.unstubAllGlobals();
  });

  it("returns generic HTTP errors and never includes the server key", async () => {
    const service = createAssistantService({
      environment: environment({ apiKey: "do-not-expose-this" }),
      provider: (async () => {
        throw new Error("unavailable");
      }) as AssistantProvider,
    });
    const result = await assistantHttpResponse("POST", request, {}, service);
    expect(result.status).toBe(502);
    expect(JSON.stringify(result.body)).not.toContain("do-not-expose-this");
    await expect(assistantHttpResponse("GET", null)).resolves.toMatchObject({
      status: 405,
    });
  });

  it("keeps provider names out of student-facing assistant components", async () => {
    const files = await Promise.all([
      readFile("src/features/assistant.tsx", "utf8"),
      readFile("src/features/learning-assistant.tsx", "utf8"),
    ]);
    expect(files.join("\n")).not.toMatch(/gemini|google/i);
  });
});
