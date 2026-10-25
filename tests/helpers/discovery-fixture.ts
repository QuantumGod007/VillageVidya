import type {
  DiscoveryFilters,
  DiscoveryResult,
} from "../../src/lib/data-access/discovery-repository";
export const previewId = "91000000-0000-4000-8000-000000000001";
export const reasons: DiscoveryResult["candidates"][number]["reasons"] = [
  "adult_test_access",
  "preview_opt_in",
  "latest_test_approval",
  "verified_grade_sufficient",
  "exact_subject_qualification",
  "qualified_language",
  "tss_floor_met",
];
export function discoveryResult(filters?: DiscoveryFilters): DiscoveryResult {
  const asOf = new Date();
  return {
    test_only: true,
    as_of: asOf.toISOString(),
    expires_at: new Date(+asOf + 60_000).toISOString(),
    context: {
      subject_id: filters?.subjectId ?? "cbse-8-mathematics",
      board_id: "cbse",
      grade: 8,
      subject: "Mathematics",
      language: filters?.language ?? "English",
    },
    availability_basis:
      filters?.weekday === null || !filters
        ? "current_ist_time"
        : "requested_weekly_window",
    more_available: false,
    candidates: [
      {
        preview_id: previewId,
        label: "Test tutor 91000000",
        eligible: true,
        verified_grade: 10,
        teaching_skill_score: 75,
        cms: 95,
        factors: { subject: 1, language: 1, teaching: 0.75, availability: 1 },
        reasons,
        has_weekly_preference: true,
        preference_matches: true,
      },
    ],
  };
}
