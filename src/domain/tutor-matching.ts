import { MATCH_WEIGHTS } from "./learning";
export type VerificationState =
  "pending" | "approved" | "rejected" | "revoked" | null;
export interface MatchingEvidence {
  adultTestEnabled: boolean;
  previewEnabled: boolean;
  verification: VerificationState;
  academicGrade: number;
  verifiedGrade: number | null;
  subjectQualified: boolean;
  languageQualified: boolean;
  teachingScore: number | null;
  preferenceMatches: boolean;
}
export const eligibilityReasons = [
  "adult_test_access_required",
  "preview_opt_in_required",
  "latest_test_approval_required",
  "verified_grade_insufficient",
  "subject_qualification_required",
  "language_qualification_required",
  "tss_floor_required",
] as const;
export type EligibilityReason = (typeof eligibilityReasons)[number];
/** Independent specification/test oracle. The browser never uses this to authorize candidates. */
export function evaluateTutorEvidence(
  e: MatchingEvidence,
  requestedGrade: number,
) {
  const reasons: EligibilityReason[] = [];
  if (!e.adultTestEnabled) reasons.push("adult_test_access_required");
  if (!e.previewEnabled) reasons.push("preview_opt_in_required");
  if (e.verification !== "approved")
    reasons.push("latest_test_approval_required");
  if (
    e.verifiedGrade === null ||
    Math.min(e.academicGrade, e.verifiedGrade) < requestedGrade
  )
    reasons.push("verified_grade_insufficient");
  if (!e.subjectQualified) reasons.push("subject_qualification_required");
  if (!e.languageQualified) reasons.push("language_qualification_required");
  if (
    e.teachingScore === null ||
    !Number.isFinite(e.teachingScore) ||
    e.teachingScore < 50 ||
    e.teachingScore > 100
  )
    reasons.push("tss_floor_required");
  const factors = {
    subject: Number(e.subjectQualified),
    language: Number(e.languageQualified),
    teaching: (e.teachingScore ?? 0) / 100,
    availability: Number(e.preferenceMatches),
  };
  const score = reasons.length
    ? null
    : Object.entries(factors).reduce(
        (sum, [key, value]) =>
          sum + value * MATCH_WEIGHTS[key as keyof typeof MATCH_WEIGHTS],
        0,
      ) * 100;
  return { eligible: reasons.length === 0, reasons, factors, score };
}
export function comparePreviewCandidates(
  a: { score: number; previewId: string },
  b: { score: number; previewId: string },
) {
  return (
    b.score - a.score ||
    (a.previewId < b.previewId ? -1 : a.previewId > b.previewId ? 1 : 0)
  );
}
