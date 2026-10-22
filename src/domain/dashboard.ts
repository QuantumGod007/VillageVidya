import type { CompletedSession, Lesson, MatchRequest, Subject } from "./types";

// The chosen subject drives this small demo-library suggestion. This is not a
// grade-specific curriculum or a claim of an AI recommendation.
export function nextLesson(
  library: Lesson[],
  progress: Record<string, number>,
  subject: Subject,
) {
  const inProgress = (lesson: Lesson) =>
    (progress[lesson.id] || 0) > 0 && (progress[lesson.id] || 0) < 100;
  const unfinished = (lesson: Lesson) => (progress[lesson.id] || 0) < 100;
  return (
    library.find(
      (lesson) => lesson.subject === subject && inProgress(lesson),
    ) ??
    library.find(
      (lesson) => lesson.subject === subject && unfinished(lesson),
    ) ??
    library.find(inProgress) ??
    library.find(unfinished)
  );
}
export function openSessions(
  requests: MatchRequest[],
  completed: CompletedSession[],
  tutorId?: string,
) {
  return requests.filter(
    (request) =>
      request.status === "accepted" &&
      !completed.some((session) => session.id === request.id) &&
      (!tutorId || request.tutorId === tutorId),
  );
}
// Sort the existing fictional slot labels against the day they were requested.
// No booking, availability guarantee or calendar integration is implied.
export function plannedTime(request: MatchRequest): number {
  const match = request.scheduled?.match(
    /^(Today|Tomorrow|Saturday), (\d{1,2}):(\d{2}) (AM|PM)$/,
  );
  if (!match) return Number.POSITIVE_INFINITY;
  const anchor = new Date(request.createdAt + 330 * 60_000);
  const day =
    match[1] === "Today"
      ? 0
      : match[1] === "Tomorrow"
        ? 1
        : (6 - anchor.getUTCDay() + 7) % 7;
  const hour = (Number(match[2]) % 12) + (match[4] === "PM" ? 12 : 0);
  return (
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth(),
      anchor.getUTCDate() + day,
      hour,
      Number(match[3]),
    ) -
    330 * 60_000
  );
}
export function nextPlannedSession(sessions: MatchRequest[], now = Date.now()) {
  return sessions
    .filter(
      (session) =>
        session.scheduled &&
        plannedTime(session) >= now &&
        Number.isFinite(plannedTime(session)),
    )
    .sort(
      (a, b) => plannedTime(a) - plannedTime(b) || a.createdAt - b.createdAt,
    )[0];
}
