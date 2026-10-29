import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { curriculum } from "../src/data/curriculum";
import { redactContact } from "../src/domain/learning";
import {
  academicContextSchema,
  lessonsFor,
  type AcademicContext,
} from "../src/domain/curriculum";
import type { Lesson } from "../src/domain/types";

const MAX_REQUEST_BYTES = 8_000;
const MAX_QUESTION_LENGTH = 1_200;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 8;

function cleanQuestion(value: string) {
  return redactContact(value)
    .replace(/\[contact removed\](?=[^\s.,!?;:])/g, "[contact removed] ")
    .trim();
}

const assistantRequestSchema = z
  .object({
    question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
    context: academicContextSchema,
    lessonId: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

const generatedAnswerSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    explanation: z.string().trim().min(1).max(1_400),
    steps: z.array(z.string().trim().min(1).max(360)).min(1).max(5),
    example: z.string().trim().min(1).max(600),
    followUp: z.string().trim().min(1).max(320).nullable(),
  })
  .strict();

export type GeneratedAnswer = z.infer<typeof generatedAnswerSchema>;
export type AssistantFailure =
  | "invalid_request"
  | "not_configured"
  | "unauthorized"
  | "rate_limited"
  | "unavailable";

type AssistantRequest = z.infer<typeof assistantRequestSchema>;

export type AssistantServiceResult =
  | { ok: true; answer: GeneratedAnswer; lessonId: string | null }
  | { ok: false; failure: AssistantFailure };

export interface AssistantEnvironment {
  apiKey: string;
  model: string;
  demoEnabled: boolean;
  hosted: boolean;
  nodeEnv: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
}

export interface ProviderInput {
  question: string;
  context: AcademicContext;
  lesson: Lesson | null;
}

export type AssistantProvider = (
  input: ProviderInput,
) => Promise<GeneratedAnswer>;

export type AccountAuthorizer = (
  authorization: string | undefined,
  context: AcademicContext,
) => Promise<{ ok: true; rateKey: string } | { ok: false }>;

export function environmentFrom(
  source: NodeJS.ProcessEnv = process.env,
): AssistantEnvironment {
  return {
    apiKey: source.GEMINI_API_KEY?.trim() ?? "",
    model: source.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
    demoEnabled: source.AI_DEMO_ENABLED === "true",
    hosted: source.VERCEL === "1" || !!source.VERCEL_ENV,
    nodeEnv: source.NODE_ENV ?? "development",
    supabaseUrl:
      source.SUPABASE_URL?.trim() ?? source.VITE_SUPABASE_URL?.trim() ?? "",
    supabasePublishableKey:
      source.SUPABASE_PUBLISHABLE_KEY?.trim() ??
      source.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ??
      "",
  };
}

class ProviderFailure extends Error {
  constructor(readonly failure: Exclude<AssistantFailure, "invalid_request" | "not_configured" | "unauthorized">) {
    super(failure);
  }
}

function lessonForRequest(request: AssistantRequest) {
  const library = lessonsFor(curriculum.lessons, request.context);
  const byId = request.lessonId
    ? library.find((lesson) => lesson.id === request.lessonId)
    : undefined;
  if (byId) return byId;
  const question = request.question.toLowerCase();
  return (
    library.find(
      (lesson) =>
        question.includes(lesson.title.toLowerCase()) ||
        lesson.keywords.some((keyword) => question.includes(keyword.toLowerCase())),
    ) ?? null
  );
}

function providerPrompt(input: ProviderInput) {
  const lessonContext = input.lesson
    ? [
        `Authored Village Vidya learning note: ${input.lesson.title}`,
        `Concept: ${input.lesson.concept}`,
        `Teaching steps: ${input.lesson.steps.join(" ")}`,
        `Familiar example: ${input.lesson.example}`,
      ].join("\n")
    : "No authored Village Vidya learning note matched this question. Do not invent textbook citations or claim verification.";
  return [
    "You are the Village Vidya AI Learning Assistant.",
    "Give a safe, age-appropriate educational explanation. Help the learner understand the reasoning rather than copy an answer.",
    `Academic context: board ${input.context.boardId}; grade ${input.context.grade}; subject ${input.context.subject}; preferred language ${input.context.language}.`,
    "Use the preferred language when you can do so accurately. Keep wording simple and use a familiar everyday example.",
    "Do not ask for or repeat personal information. Do not claim that anything is verified against a textbook unless the supplied note explicitly says so.",
    "Return only a JSON object with title, explanation, steps, example, and followUp. followUp may be null.",
    lessonContext,
    `Learner question: ${input.question}`,
  ].join("\n\n");
}

function responseSchema() {
  return {
    type: "object",
    properties: {
      title: { type: "string" },
      explanation: { type: "string" },
      steps: { type: "array", items: { type: "string" } },
      example: { type: "string" },
      followUp: { type: ["string", "null"] },
    },
    required: ["title", "explanation", "steps", "example", "followUp"],
    propertyOrdering: ["title", "explanation", "steps", "example", "followUp"],
  };
}

export function geminiProvider(
  environment: AssistantEnvironment,
): AssistantProvider {
  return async (input) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(environment.model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": environment.apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: providerPrompt(input) }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 750,
              responseMimeType: "application/json",
              responseJsonSchema: responseSchema(),
            },
          }),
        },
      );
      if (response.status === 429) throw new ProviderFailure("rate_limited");
      if (!response.ok) throw new ProviderFailure("unavailable");
      const payload: unknown = await response.json();
      const candidates =
        typeof payload === "object" &&
        payload !== null &&
        Array.isArray((payload as { candidates?: unknown }).candidates)
          ? (payload as {
              candidates: Array<{
                content?: { parts?: Array<{ text?: unknown }> };
              }>;
            }).candidates
          : [];
      const text = (candidates[0]?.content?.parts ?? [])
        .map((part) => part.text)
        .find((part): part is string => typeof part === "string");
      if (!text) throw new ProviderFailure("unavailable");
      const parsed = generatedAnswerSchema.safeParse(JSON.parse(text));
      if (!parsed.success) throw new ProviderFailure("unavailable");
      return parsed.data;
    } catch (error) {
      if (error instanceof ProviderFailure) throw error;
      throw new ProviderFailure("unavailable");
    } finally {
      clearTimeout(timeout);
    }
  };
}

function expectedSubjectId(context: AcademicContext) {
  return curriculum.subjects.find((subject) => {
    const grade = curriculum.grades.find((item) => item.id === subject.gradeId);
    return (
      subject.name === context.subject &&
      grade?.boardId === context.boardId &&
      grade.number === context.grade
    );
  })?.id;
}

export function supabaseAuthorizer(
  environment: AssistantEnvironment,
): AccountAuthorizer {
  return async (authorization, context) => {
    if (!authorization?.startsWith("Bearer ")) return { ok: false };
    if (!environment.supabaseUrl || !environment.supabasePublishableKey)
      return { ok: false };
    const token = authorization.slice("Bearer ".length).trim();
    if (!token) return { ok: false };
    const subjectId = expectedSubjectId(context);
    if (!subjectId) return { ok: false };
    const client = createClient(
      environment.supabaseUrl,
      environment.supabasePublishableKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: { headers: { Authorization: `Bearer ${token}` } },
      },
    );
    const user = await client.auth.getUser(token);
    if (user.error || !user.data.user?.email_confirmed_at) return { ok: false };
    const id = user.data.user.id;
    const [profile, access, roles] = await Promise.all([
      client.from("profiles").select("id").eq("id", id).maybeSingle(),
      client
        .from("adult_test_accounts")
        .select("enabled")
        .eq("user_id", id)
        .maybeSingle(),
      client.from("user_roles").select("role").eq("user_id", id),
    ]);
    if (
      profile.error ||
      !profile.data ||
      access.error ||
      !access.data?.enabled ||
      roles.error ||
      !roles.data
    )
      return { ok: false };
    const allowed = new Set(roles.data.map((row) => row.role));
    if (allowed.has("learner")) {
      const enrollment = await client
        .from("learner_academic_enrollments")
        .select("subject_id, language")
        .eq("learner_id", id)
        .eq("is_active", true)
        .maybeSingle();
      if (
        !enrollment.error &&
        enrollment.data?.subject_id === subjectId &&
        enrollment.data.language === context.language
      )
        return { ok: true, rateKey: `account:${id}` };
    }
    if (allowed.has("tutor")) {
      const [qualification, language] = await Promise.all([
        client
          .from("tutor_subject_qualifications")
          .select("subject_id")
          .eq("tutor_id", id)
          .eq("subject_id", subjectId)
          .maybeSingle(),
        client
          .from("tutor_languages")
          .select("language")
          .eq("tutor_id", id)
          .eq("language", context.language)
          .maybeSingle(),
      ]);
      if (!qualification.error && qualification.data && !language.error && language.data)
        return { ok: true, rateKey: `account:${id}` };
    }
    return { ok: false };
  };
}

export function createAssistantService(options?: {
  environment?: AssistantEnvironment;
  provider?: AssistantProvider;
  authorizer?: AccountAuthorizer;
  now?: () => number;
}) {
  const environment = options?.environment ?? environmentFrom();
  const provider = options?.provider ?? geminiProvider(environment);
  const authorizer = options?.authorizer ?? supabaseAuthorizer(environment);
  const now = options?.now ?? Date.now;
  const requests = new Map<string, { started: number; count: number }>();
  const productionBoundary = environment.hosted || environment.nodeEnv === "production";

  function permitted(rateKey: string) {
    const time = now();
    const previous = requests.get(rateKey);
    if (!previous || time - previous.started >= RATE_LIMIT_WINDOW_MS) {
      requests.set(rateKey, { started: time, count: 1 });
      return true;
    }
    if (previous.count >= RATE_LIMIT_MAX_REQUESTS) return false;
    previous.count += 1;
    return true;
  }

  return {
    async answer(
      body: unknown,
      authorization?: string,
    ): Promise<AssistantServiceResult> {
      const request = assistantRequestSchema.safeParse(body);
      if (!request.success) return { ok: false, failure: "invalid_request" };
      const question = cleanQuestion(request.data.question);
      if (!question) return { ok: false, failure: "invalid_request" };
      const sanitized = { ...request.data, question };
      let rateKey = "local-demo";
      if (productionBoundary || authorization) {
        const account = await authorizer(authorization, sanitized.context);
        if (!account.ok) return { ok: false, failure: "unauthorized" };
        rateKey = account.rateKey;
      } else if (!environment.demoEnabled) {
        return { ok: false, failure: "not_configured" };
      }
      if (!environment.apiKey) return { ok: false, failure: "not_configured" };
      if (!permitted(rateKey)) return { ok: false, failure: "rate_limited" };
      const lesson = lessonForRequest(sanitized);
      try {
        const answer = await provider({
          question: sanitized.question,
          context: sanitized.context,
          lesson,
        });
        const validated = generatedAnswerSchema.safeParse(answer);
        if (!validated.success)
          return { ok: false, failure: "unavailable" };
        return { ok: true, answer: validated.data, lessonId: lesson?.id ?? null };
      } catch (error) {
        return {
          ok: false,
          failure:
            error instanceof ProviderFailure ? error.failure : "unavailable",
        };
      }
    },
  };
}

export interface AssistantHttpResult {
  status: number;
  body: AssistantServiceResult | { ok: false; failure: "invalid_request" };
}

export async function assistantHttpResponse(
  method: string | undefined,
  body: unknown,
  headers: Record<string, string | string[] | undefined> = {},
  service = createAssistantService(),
): Promise<AssistantHttpResult> {
  if (method !== "POST")
    return { status: 405, body: { ok: false, failure: "invalid_request" } };
  const authorization = headers.authorization;
  const result = await service.answer(
    body,
    typeof authorization === "string" ? authorization : undefined,
  );
  const status = result.ok
    ? 200
    : result.failure === "invalid_request"
      ? 400
      : result.failure === "unauthorized"
        ? 401
        : result.failure === "rate_limited"
          ? 429
          : result.failure === "not_configured"
            ? 503
            : 502;
  return { status, body: result };
}

export async function parseAssistantBody(body: unknown) {
  if (typeof body === "string") {
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) return null;
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return null;
    }
  }
  if (Buffer.isBuffer(body)) return parseAssistantBody(body.toString("utf8"));
  return body;
}
