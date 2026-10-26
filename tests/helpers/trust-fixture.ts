import { vi } from "vitest";
import { setupAccount } from "./account-fixture";
import { curriculum } from "../../src/data/curriculum";
import type { Role } from "../../src/domain/types";
import type { TrustSnapshot } from "../../src/lib/data-access/trust-repository";
export const trustIds = {
  tutor: "80000000-0000-4000-8000-000000000001",
  guardian: "80000000-0000-4000-8000-000000000002",
  learner: "80000000-0000-4000-8000-000000000003",
  link: "80000000-0000-4000-8000-000000000004",
  report: "80000000-0000-4000-8000-000000000005",
};
export function trustFixture(role: Role = "champion") {
  const f = setupAccount(role);
  const now = "2026-10-25T12:00:00Z";
  const records: TrustSnapshot = {
    test_only: true,
    as_of: now,
    staff: role === "champion" || role === "admin",
    administrator: role === "admin",
    tutor_reviews: [],
    relationships: [],
    reports: [],
    safety_queue: [],
    accounts: [],
    recent_actions: [],
    more: {
      tutors: false,
      relationships: false,
      reports: false,
      safety: false,
      accounts: false,
      actions: false,
    },
  };
  if (records.staff)
    records.tutor_reviews = [
      {
        tutor_id: trustIds.tutor,
        target_active: true,
        label: "Test tutor 80000000",
        academic_grade: 12,
        teaching_skill_score: 75,
        status: "not_started",
        last_event: 0,
        last_reason: null,
        reviewed_at: null,
        reviewer_id: null,
        token: "current-token",
        subjects: ["cbse-8-mathematics"],
        languages: ["English"],
        evidence: {
          label: "synthetic_classroom",
          note: "SYNTHETIC classroom metadata. No physical documents verified.",
          prepared_by: trustIds.guardian,
          created_at: now,
          event_number: 1,
        },
        approval_missing: [],
      },
    ];
  if (role === "guardian" || role === "admin")
    records.relationships = [
      {
        id: trustIds.link,
        guardian_id: trustIds.guardian,
        learner_id: trustIds.learner,
        status: "approved",
        revision: 1,
        consent_status: "approved",
        consent_event: 2,
        policy_version: "adult-test-v1",
        recorded_at: now,
        can_share: true,
      },
    ];
  vi.mocked(f.access.curriculum.load).mockResolvedValue(curriculum);
  vi.mocked(f.access.trust.load).mockImplementation(async () =>
    structuredClone(records),
  );
  vi.mocked(f.access.trust.learner).mockResolvedValue({
    test_only: true,
    as_of: now,
    display_name: "Linked adult learner",
    language: "English",
    enrollments: [],
    progress: [],
  });
  return { ...f, records };
}
