import { z } from "zod";
import type {
  Evaluation,
  Language,
  MatchRequest,
  Role,
  SessionStatus,
  Tier,
  Tutor,
  Subject,
} from "./types";
export const MATCH_WEIGHTS = {
  subject: 0.35,
  language: 0.3,
  teaching: 0.2,
  availability: 0.15,
} as const;
export function isEligible(tutor: Tutor, grade: number, subject: Subject) {
  return (
    tutor.verified &&
    tutor.tss >= 50 &&
    tutor.grade >= grade &&
    tutor.subjects.includes(subject)
  );
}
export function calculateMatch(
  tutor: Tutor,
  subject: Subject,
  language: Language,
) {
  const factors = {
    subject: tutor.subjects.includes(subject) ? 1 : 0,
    language: tutor.languages.includes(language) ? 1 : 0,
    teaching: Math.max(0, Math.min(100, tutor.tss)) / 100,
    availability: tutor.available ? 1 : 0,
  };
  return {
    factors,
    score:
      Object.entries(factors).reduce(
        (s, [k, v]) => s + v * MATCH_WEIGHTS[k as keyof typeof factors],
        0,
      ) * 100,
  };
}
export function rankTutors(
  tutors: Tutor[],
  grade: number,
  subject: Subject,
  language: Language,
) {
  return tutors
    .filter((t) => isEligible(t, grade, subject))
    .map((t) => ({ tutor: t, ...calculateMatch(t, subject, language) }))
    .sort((a, b) => b.score - a.score);
}
export function sessionScore(evaluation: Evaluation) {
  return (
    evaluation.correctness * 0.3 +
    evaluation.completeness * 0.25 +
    evaluation.clarity * 0.2 +
    evaluation.reasoning * 0.15 +
    evaluation.tone * 0.1
  );
}
export function updateTSS(previous: number, score: number) {
  return previous * 0.85 + score * 0.15;
}
export function tierFor(score: number, sessions: number): Tier {
  if (score >= 90) return "Village Guide";
  if (score >= 82 && sessions >= 25) return "Mentor";
  if (score >= 70) return "Explainer";
  return "Helper";
}
const tierFloor: Record<Tier, number> = {
  Helper: 50,
  Explainer: 70,
  Mentor: 82,
  "Village Guide": 90,
};
export function progression(
  score: number,
  sessions: number,
  current: Tier,
  belowFloorSessions: number,
) {
  const below = score < tierFloor[current];
  const streak = below ? belowFloorSessions + 1 : 0;
  return {
    tier: below && streak <= 3 ? current : tierFor(score, sessions),
    graceRemaining: below ? Math.max(0, 3 - streak) : 3,
    belowFloorSessions: streak,
  };
}
export function expireRequest(
  request: MatchRequest,
  now: number,
): MatchRequest {
  return request.status === "pending" && now - request.createdAt >= 45_000
    ? { ...request, status: "expired" }
    : request;
}
export function canTransition(from: SessionStatus, to: SessionStatus) {
  const allowed: Record<SessionStatus, SessionStatus[]> = {
    active: ["reconnecting", "completed", "terminated"],
    reconnecting: ["active", "completed", "terminated"],
    completed: [],
    terminated: [],
  };
  return allowed[from].includes(to);
}
export function canAccess(role: Role | null, allowed: Role[]) {
  return role !== null && allowed.includes(role);
}
// This deliberately small local safeguard is not a replacement for server moderation.
export function redactContact(text: string) {
  return text
    .replace(/(?:\+?\d[\s().-]*){10,}/g, "[contact removed]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email removed]")
    .replace(/(?:https?:\/\/|www\.)\S+/gi, "[link removed]");
}
export const profileSchema = z.object({
  boardId: z.enum(["cbse", "maharashtra"]).default("cbse"),
  grade: z.coerce
    .number()
    .int()
    .min(4)
    .max(10)
    .transform((v) => v as import("./curriculum").LearnerGrade),
  language: z.enum(["English", "हिन्दी", "मराठी", "తెలుగు"]),
  subject: z.enum(["Mathematics", "Science", "English", "Social Science"]),
  fictionalOnly: z
    .boolean()
    .refine((v) => v, "Please confirm you are exploring a fictional profile."),
});
export function mastery(correct: number, total: number) {
  return total > 0
    ? Math.round(Math.max(0, Math.min(correct / total, 1)) * 100)
    : 0;
}

/** Keep binary floating-point noise out of presentation; calculations retain full precision. */
export function displayScore(value: number, digits = 1) {
  const factor = 10 ** digits;
  return (Math.round((value + 1e-9) * factor) / factor).toFixed(digits);
}
