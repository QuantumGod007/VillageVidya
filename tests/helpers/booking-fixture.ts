import { vi } from "vitest";
import { setupAccount } from "./account-fixture";
import type {
  BookingSnapshot,
  TestRequest,
  TestSession,
} from "../../src/lib/data-access/booking-repository";
export const bookingIds = {
  request: "a1000000-0000-4000-8000-000000000001",
  session: "a1000000-0000-4000-8000-000000000002",
  next: "a1000000-0000-4000-8000-000000000003",
  preview: "a1000000-0000-4000-8000-000000000004",
};
export function bookingFixture(role: "learner" | "tutor" = "learner") {
  const f = setupAccount(role),
    repository = f.access.bookings.forActor(f.session.user.id);
  const now = "2026-10-26T12:00:00Z";
  const request: TestRequest = {
    id: bookingIds.request,
    viewer_role: role,
    tutor_label: "Test tutor a1000000",
    learner_label: "Adult learner 12345678",
    subject_id: "cbse-8-mathematics",
    subject: "Mathematics",
    language: "English",
    starts_at: "2026-10-27T10:30:00Z",
    ends_at: "2026-10-27T10:45:00Z",
    topic: "Synthetic fractions practice",
    created_at: now,
    updated_at: now,
    expires_at: "2026-10-26T12:00:45Z",
    search_expires_at: "2026-10-26T12:01:30Z",
    status: "pending",
    revision: 1,
    session_id: null,
    can_fallback: false,
  };
  const session: TestSession = {
    id: bookingIds.session,
    request_id: request.id,
    viewer_role: role,
    tutor_label: request.tutor_label,
    learner_label: request.learner_label,
    subject_id: request.subject_id,
    subject: request.subject,
    language: request.language,
    starts_at: request.starts_at,
    ends_at: request.ends_at,
    status: "scheduled",
    revision: 1,
    started_at: null,
    completed_at: null,
    cancelled_at: null,
    summary: "",
    history: [
      {
        event_number: 1,
        status: "scheduled",
        actor_role: "tutor",
        created_at: now,
        note: "Synthetic fixture: interval reserved.",
      },
    ],
  };
  const records: BookingSnapshot = {
    test_only: true,
    as_of: now,
    more: false,
    requests: [request],
    sessions: [],
  };
  vi.mocked(repository.load).mockImplementation(async () =>
    structuredClone(records),
  );
  return { ...f, records, request, session, repository };
}
