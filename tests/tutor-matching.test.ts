import { describe, expect, it } from "vitest";
import {
  comparePreviewCandidates,
  evaluateTutorEvidence,
  type MatchingEvidence,
} from "../src/domain/tutor-matching";
const valid: MatchingEvidence = {
  adultTestEnabled: true,
  previewEnabled: true,
  verification: "approved",
  academicGrade: 12,
  verifiedGrade: 10,
  subjectQualified: true,
  languageQualified: true,
  teachingScore: 75,
  preferenceMatches: true,
};
describe("adult-only preview eligibility and SRS matching specification", () => {
  it("uses the existing 35/30/20/15 CMS weights", () => {
    const match = evaluateTutorEvidence(valid, 8);
    expect(match.eligible).toBe(true);
    expect(match.score).toBeCloseTo(95);
    expect(match.factors).toEqual({
      subject: 1,
      language: 1,
      teaching: 0.75,
      availability: 1,
    });
    expect(
      evaluateTutorEvidence({ ...valid, preferenceMatches: false }, 8).score,
    ).toBeCloseTo(80);
  });
  it.each([
    [{ adultTestEnabled: false }, "adult_test_access_required"],
    [{ previewEnabled: false }, "preview_opt_in_required"],
    [{ verification: null }, "latest_test_approval_required"],
    [{ verification: "pending" }, "latest_test_approval_required"],
    [{ verification: "rejected" }, "latest_test_approval_required"],
    [{ verification: "revoked" }, "latest_test_approval_required"],
    [{ verifiedGrade: 7 }, "verified_grade_insufficient"],
    [{ verifiedGrade: null }, "verified_grade_insufficient"],
    [{ academicGrade: 7 }, "verified_grade_insufficient"],
    [{ subjectQualified: false }, "subject_qualification_required"],
    [{ languageQualified: false }, "language_qualification_required"],
    [{ teachingScore: null }, "tss_floor_required"],
    [{ teachingScore: 49.99 }, "tss_floor_required"],
    [{ teachingScore: 101 }, "tss_floor_required"],
  ] as const)(
    "rejects missing or insufficient evidence %o",
    (override, reason) => {
      const result = evaluateTutorEvidence({ ...valid, ...override }, 8);
      expect(result.eligible).toBe(false);
      expect(result.score).toBeNull();
      expect(result.reasons).toContain(reason);
    },
  );
  it("accepts equal verified grade and the exact TSS floor", () =>
    expect(
      evaluateTutorEvidence(
        { ...valid, verifiedGrade: 8, teachingScore: 50 },
        8,
      ).score,
    ).toBeCloseTo(90));
  it("returns all blocking reasons rather than masking missing evidence", () =>
    expect(
      evaluateTutorEvidence(
        {
          ...valid,
          subjectQualified: false,
          languageQualified: false,
          teachingScore: null,
        },
        8,
      ).reasons,
    ).toEqual([
      "subject_qualification_required",
      "language_qualification_required",
      "tss_floor_required",
    ]));
  it("ranks by unrounded CMS and stable opaque ID for ties", () => {
    const rows = [
      { score: 95, previewId: "b" },
      { score: 95.001, previewId: "c" },
      { score: 95, previewId: "a" },
    ];
    expect(rows.sort(comparePreviewCandidates).map((r) => r.previewId)).toEqual(
      ["c", "a", "b"],
    );
  });
});
