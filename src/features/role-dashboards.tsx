import { lessonsFor, progressFor } from "../domain/curriculum";
import { curriculum } from "../data/curriculum";
import "./role-dashboards.css";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Inbox,
  Sparkles,
} from "lucide-react";
import { Button, ButtonLink, Eyebrow, Progress } from "../components/ui";
import { lessons, tutors } from "../data/demo";
import { useStore, languageLabels } from "../lib/store";
import { useTutorCatalog } from "../lib/use-tutors";
import {
  nextLesson,
  openSessions,
  nextPlannedSession,
} from "../domain/dashboard";
import { displayScore, sessionScore } from "../domain/learning";
import type { CompletedSession, MatchRequest } from "../domain/types";

const timeLabel = (at: number) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(at);
function SectionTitle({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="role-section-title">
      <h2>
        <span>{number}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}
function PlannedSession({
  session,
  tutor = false,
}: {
  session?: MatchRequest;
  tutor?: boolean;
}) {
  const peer = tutors.find((person) => person.id === session?.tutorId);
  return (
    <div className="role-session-plan">
      <CalendarDays size={19} aria-hidden="true" />
      <div>
        {session ? (
          <>
            <h3>{session.topic}</h3>
            <p>
              {session.scheduled} IST ·{" "}
              {tutor ? "With Aarav" : `With ${peer?.name ?? "your demo tutor"}`}
            </p>
            <span className="role-caption">
              Fictional plan · Grade {session.academic?.grade ?? "—"} ·{" "}
              {session.academic?.language ?? "English"} · no real booking
            </span>
            <Link className="role-text-link" to="/sessions">
              View session <ArrowUpRight size={14} />
            </Link>
          </>
        ) : (
          <>
            <h3>No upcoming session.</h3>
            <p>
              {tutor
                ? "Accepted session plans will appear here during this visit."
                : "When a fictional session is accepted, your plan will appear here."}
            </p>
            {!tutor && (
              <Link className="role-text-link" to="/tutors">
                Find a tutor <ArrowUpRight size={14} />
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
function TeachingActivity({ sessions }: { sessions: CompletedSession[] }) {
  return sessions.length ? (
    <ol className="role-activity-list">
      {[...sessions]
        .sort((a, b) => b.date - a.date)
        .slice(0, 4)
        .map((session) => (
          <li key={session.id}>
            <span className="role-activity-icon">
              <Check size={16} />
            </span>
            <div>
              <strong>{session.topic}</strong>
              <p>
                {session.minutes} min practice · {session.elic} confusion{" "}
                {session.elic === 1 ? "checkpoint" : "checkpoints"}
              </p>
            </div>
            <time dateTime={new Date(session.date).toISOString()}>
              {timeLabel(session.date)}
            </time>
          </li>
        ))}
    </ol>
  ) : (
    <div className="role-empty-inline">
      <Clock3 size={20} />
      <div>
        <h3>No teaching activity this visit.</h3>
        <p>
          Complete a practice session to see its summary here. Messages and
          notes are never included.
        </p>
      </div>
    </div>
  );
}

export function LearnerDashboard() {
  const { data, requests, completed, learningActivity } = useStore();
  const sessions = openSessions(requests, completed);
  const ready = sessions.find((session) => !session.scheduled);
  const planned = nextPlannedSession(sessions);
  const pending = requests.find((request) => request.status === "pending");
  const library = lessonsFor(lessons, data);
  const summary = progressFor(library, data.progress, data.saved);
  const next = nextLesson(lessons, data.progress, data);
  const fullyComplete = library.filter(
    (lesson) => data.progress[lesson.id] === 100,
  ).length;
  const continuing = library
    .filter(
      (lesson) =>
        (data.progress[lesson.id] || 0) > 0 &&
        (data.progress[lesson.id] || 0) < 100 &&
        (ready || lesson.id !== next?.id),
    )
    .sort(
      (a, b) =>
        Number(b.subject === data.subject) - Number(a.subject === data.subject),
    )
    .slice(0, 3);
  const activity = [
    ...learningActivity
      .filter((item) => library.some((l) => l.id === item.lessonId))
      .map((item) => ({
        id: item.id,
        at: item.at,
        title:
          lessons.find((lesson) => lesson.id === item.lessonId)?.title ??
          "Lesson checkpoint",
        detail:
          item.score === 100
            ? "Checkpoint understood"
            : "Checkpoint attempted · keep practising",
        to: `/lesson/${item.lessonId}`,
      })),
    ...completed.map((item) => ({
      id: item.id,
      at: item.date,
      title: item.topic,
      detail: "Practice session completed",
      to: "/sessions",
    })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 4);
  const primaryTitle = ready
    ? "Your peer is ready to help."
    : next
      ? next.title
      : library.length
        ? "You’ve completed these practice checkpoints."
        : "Your next chapter is still to come.";
  return (
    <div className="role-dashboard learner-overview">
      <header className="role-page-heading">
        <Eyebrow>YOUR LEARNING, AT YOUR PACE</Eyebrow>
        <h1>
          {languageLabels[data.language].hello}, <em>Aarav.</em>
        </h1>
        <div className="role-context">
          <span>
            {curriculum.boards.find((b) => b.id === data.boardId)?.name} · Grade{" "}
            {data.grade}
          </span>
          <span>{data.language}</span>
          <span>{data.subject}</span>
          <Link to="/settings" aria-label="Change learning preferences">
            Change <ArrowUpRight size={13} />
          </Link>
        </div>
      </header>
      <section className="role-next-action" aria-labelledby="next-action-title">
        <div className="role-next-copy">
          <Eyebrow>
            {ready
              ? "READY FOR LOCAL PRACTICE"
              : next
                ? "YOUR NEXT STEP"
                : library.length
                  ? "A MILESTONE WORTH KEEPING"
                  : "CURRICULUM COVERAGE"}
          </Eyebrow>
          <h2 id="next-action-title">{primaryTitle}</h2>
          <p>
            {ready
              ? `${ready.topic} · with ${tutors.find((person) => person.id === ready.tutorId)?.name ?? "a demo peer"}. Grade ${ready.academic?.grade ?? data.grade} · ${ready.academic?.language ?? data.language}. Continue the conversation when you’re ready.`
              : next
                ? `A small step in Grade ${data.grade} ${data.subject.toLowerCase()}, based on your saved practice progress.`
                : library.length
                  ? "Review a familiar idea or find a peer to explore it in another way."
                  : `No ${data.language} lessons have been added for Grade ${data.grade} ${data.subject} on this board yet. Choose another academic context in My Learning or ask a peer tutor for help.`}
          </p>
          {!ready && next && (
            <div className="role-lesson-meta">
              <span>
                {next.subject} · Grade {next.grade} · {next.minutes} min
              </span>
              <span>Original practice note</span>
            </div>
          )}
          {pending && (
            <p className="role-caption">
              A demo invitation is pending. You can keep learning while you
              wait.
            </p>
          )}
          <ButtonLink
            to={
              ready
                ? `/room/${ready.id}`
                : next
                  ? `/lesson/${next.id}`
                  : "/explore"
            }
          >
            {ready
              ? "Join practice"
              : next
                ? "Continue learning"
                : library.length
                  ? "Review the library"
                  : "Explore academic context"}
            <ArrowRight size={16} />
          </ButtonLink>
        </div>
        {!ready && next && (
          <div className="role-next-progress">
            <span className="role-progress-number">
              {data.progress[next.id] || 0}
              <small>%</small>
            </span>
            <span>checkpoint progress</span>
            <Progress
              value={data.progress[next.id] || 0}
              label={`${next.title} progress`}
            />
          </div>
        )}
      </section>
      <div className="role-overview-columns">
        <div className="role-main-column">
          {planned && (
            <section className="role-section">
              <SectionTitle number="01" title="Upcoming session" />
              <PlannedSession session={planned} />
            </section>
          )}
          <section className="role-section">
            <SectionTitle
              number={planned ? "02" : "01"}
              title="Continue learning"
            >
              <Link to="/explore" className="role-text-link">
                My Learning <ArrowUpRight size={14} />
              </Link>
            </SectionTitle>
            {continuing.length ? (
              <div className="role-lesson-list">
                {continuing.map((lesson) => (
                  <Link
                    key={lesson.id}
                    to={`/lesson/${lesson.id}`}
                    className="role-lesson-row"
                  >
                    <span className="role-subject-mark" aria-hidden="true">
                      <BookOpen size={19} />
                    </span>
                    <div>
                      <span className="role-caption">
                        {lesson.subject} · Grade {lesson.grade} ·{" "}
                        {lesson.minutes} min
                      </span>
                      <h3>{lesson.title}</h3>
                      <Progress
                        value={data.progress[lesson.id] || 0}
                        label={`${lesson.title} saved progress`}
                      />
                    </div>
                    <span className="role-row-percent">
                      {data.progress[lesson.id]}%<ArrowUpRight size={15} />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="role-empty-inline">
                <BookOpen size={21} />
                <div>
                  <h3>
                    {next
                      ? "One idea at a time."
                      : library.length
                        ? "All selected checkpoints complete."
                        : "No practice in this context yet."}
                  </h3>
                  <p>
                    {next
                      ? "Your suggested lesson is above. Other lessons you start will appear here."
                      : library.length
                        ? "Revisit the library whenever you want to practise again."
                        : "My Learning shows available subjects, chapters and coverage gaps."}
                  </p>
                </div>
              </div>
            )}
          </section>
          <section className="role-section">
            <SectionTitle
              number={planned ? "03" : "02"}
              title="Recent learning"
            >
              <span className="role-caption">This visit</span>
            </SectionTitle>
            {activity.length ? (
              <ol className="role-activity-list">
                {activity.map((item) => (
                  <li key={item.id}>
                    <span className="role-activity-icon">
                      <Check size={16} />
                    </span>
                    <div>
                      <Link to={item.to}>{item.title}</Link>
                      <p>{item.detail}</p>
                    </div>
                    <time dateTime={new Date(item.at).toISOString()}>
                      {timeLabel(item.at)}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="role-empty-inline">
                <Clock3 size={21} />
                <div>
                  <h3>A fresh page for this visit.</h3>
                  <p>
                    Try a checkpoint or complete a practice session to start
                    your activity list. Saved progress is kept separately.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
        <aside
          className="role-secondary-column"
          aria-label="Learning summaries"
        >
          <section className="role-quiet-section">
            <Eyebrow>YOUR LEARNING SNAPSHOT</Eyebrow>
            <div className="role-quiet-stat">
              <strong>
                {fullyComplete}
                <small> / {library.length}</small>
              </strong>
              <span>selected checkpoints complete</span>
            </div>
            <div className="role-summary-line">
              <span>Saved lessons</span>
              <strong>{summary.saved}</strong>
            </div>
            <Link to="/learn/progress" className="role-text-link">
              View progress <ArrowUpRight size={14} />
            </Link>
            <p className="role-caption">
              Practice progress, not a formal assessment.
            </p>
          </section>
          {!planned && (
            <section className="role-quiet-section">
              <Eyebrow>LEARN WITH A PEER</Eyebrow>
              <PlannedSession />
            </section>
          )}
          <section className="role-quiet-section">
            <Eyebrow>WHEN YOU NEED ANOTHER WAY</Eyebrow>
            <p>
              Ask a question with the curated AI demo, or learn from ideas
              shared by the village.
            </p>
            <Link className="role-text-link" to="/assistant">
              Ask AI <ArrowUpRight size={14} />
            </Link>
            <Link className="role-text-link" to="/community">
              Visit Community <ArrowUpRight size={14} />
            </Link>
          </section>
        </aside>
      </div>
      <p className="role-footnote">
        Fictional profile · progress for the selected academic context on this
        device, activity for this visit.
      </p>
    </div>
  );
}

export function TutorDashboard() {
  const {
    data,
    setPreferences,
    requests,
    request,
    updateRequest,
    completed,
    toast,
  } = useStore();
  const navigate = useNavigate();
  const tutor = useTutorCatalog().find((person) => person.id === "aditi")!;
  const own = completed.filter((session) => session.tutorId === tutor.id);
  const pending = requests.filter(
    (item) => item.tutorId === tutor.id && item.status === "pending",
  );
  const accepted = openSessions(requests, completed, tutor.id);
  const ready = accepted.find((item) => !item.scheduled);
  const planned = nextPlannedSession(accepted);
  const latest = [...own].sort((a, b) => b.date - a.date)[0];
  function sampleRequest() {
    request(tutor.id, "Mathematics", "Keeping the balance", undefined, {
      academic: {
        boardId: "cbse",
        grade: 8,
        subject: "Mathematics",
        language: "English",
      },
      lessonId: "equations",
    });
    toast(
      "Fictional practice request created. It expires after 45 seconds; no learner was contacted.",
    );
  }
  return (
    <div className="role-dashboard tutor-overview">
      <header className="role-page-heading">
        <Eyebrow>YOUR TEACHING WORKSPACE</Eyebrow>
        <h1>
          Ready to make <em>things click?</em>
        </h1>
        <div className="role-context">
          <span>Aditi</span>
          <span>{tutor.subjects.join(" & ")}</span>
        </div>
      </header>
      <section
        className="role-request-section"
        id="requests"
        tabIndex={-1}
        aria-labelledby="request-title"
      >
        <div className="role-request-heading">
          <div>
            <Eyebrow>FIRST, THE PEOPLE WHO NEED YOU</Eyebrow>
            <h2 id="request-title">
              Tutoring requests{" "}
              <span className="role-count">{pending.length}</span>
            </h2>
          </div>
          <span className="role-caption">
            Local demo · 45-second invitations
          </span>
        </div>
        {pending.length ? (
          pending.map((item) => (
            <article className="role-request-row" key={item.id}>
              <div>
                <span className="role-caption">
                  Aarav · Grade {item.academic?.grade ?? data.grade} ·{" "}
                  {item.academic?.language ?? data.language}
                </span>
                <h3>{item.topic}</h3>
                <p>Fictional request · {item.subject}</p>
              </div>
              <div className="role-request-actions">
                <Button
                  onClick={() => {
                    updateRequest(item.id, "accepted");
                    navigate(`/room/${item.id}`);
                  }}
                >
                  Accept & join <ArrowRight size={15} />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    updateRequest(item.id, "declined");
                    toast("Fictional request declined.");
                  }}
                >
                  Decline
                </Button>
              </div>
            </article>
          ))
        ) : (
          <div className="role-request-empty">
            <span className="role-request-symbol">
              <Inbox size={26} strokeWidth={1.3} />
            </span>
            <div>
              <h3>No pending requests.</h3>
              <p>
                {data.available
                  ? "You’re available in this browser’s demo. New invitations will appear here."
                  : "Your availability is paused. You can turn it on below when you’re ready."}
              </p>
            </div>
            <Button variant="outline" onClick={sampleRequest}>
              Create sample request <ArrowUpRight size={15} />
            </Button>
          </div>
        )}
      </section>
      {ready && (
        <div className="role-ready-session">
          <div>
            <span className="role-caption">ACCEPTED PRACTICE</span>
            <h3>{ready.topic}</h3>
            <p>Your local room is ready to reopen.</p>
          </div>
          <ButtonLink to={`/room/${ready.id}`}>
            Join practice <ArrowRight size={15} />
          </ButtonLink>
        </div>
      )}
      <section id="schedule" tabIndex={-1} className="role-schedule-section">
        <div>
          <SectionTitle number="01" title="Next scheduled session" />
          <PlannedSession session={planned} tutor />
        </div>
        <div className="role-availability">
          <span className="role-caption">YOUR AVAILABILITY</span>
          <label className="availability-toggle">
            <input
              type="checkbox"
              role="switch"
              aria-label="Available for demo tutoring"
              checked={data.available}
              onChange={(event) => {
                setPreferences({ available: event.target.checked });
                toast(
                  event.target.checked
                    ? "Demo availability is on."
                    : "Demo availability is paused.",
                );
              }}
            />
            <span className="switch-track" />
            <span>
              {data.available ? "Available to help" : "Taking a pause"}
            </span>
          </label>
          <p>
            Controls immediate demo matching on this device. Real calendar
            booking is not connected.
          </p>
        </div>
      </section>
      <div className="role-overview-columns">
        <div className="role-main-column">
          <section className="role-section">
            <SectionTitle number="02" title="Recent teaching">
              <Link className="role-text-link" to="/sessions">
                All sessions <ArrowUpRight size={14} />
              </Link>
            </SectionTitle>
            <TeachingActivity sessions={own} />
          </section>
          <section className="role-section role-feedback-summary">
            <SectionTitle number="03" title="Co-Teacher notebook" />
            <div className="role-feedback-body">
              <Sparkles size={23} strokeWidth={1.4} />
              <div>
                {latest ? (
                  <>
                    <h3>A practice lesson to reflect on.</h3>
                    <p>
                      {latest.topic} ·{" "}
                      {displayScore(sessionScore(latest.evaluation), 1)}/100
                      illustrative evaluation. Try asking the learner to explain
                      the idea back.
                    </p>
                    <span className="role-caption">
                      Sample rubric applied to a completed practice · not live
                      AI analysis
                    </span>
                  </>
                ) : (
                  <>
                    <h3>No feedback from this visit yet.</h3>
                    <p>
                      Complete a practice session for a summary. You can explore
                      the illustrative five-dimension report at any time.
                    </p>
                  </>
                )}
                <Link className="role-text-link" to="/studio/feedback">
                  {latest
                    ? "Read sample feedback"
                    : "Explore the sample report"}
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </section>
        </div>
        <aside className="role-secondary-column" aria-label="Teaching progress">
          <section className="role-quiet-section" id="growth" tabIndex={-1}>
            <Eyebrow>TEACHING PROGRESS</Eyebrow>
            <div className="role-quiet-stat">
              <strong>{own.length}</strong>
              <span>completed practices this visit</span>
            </div>
            <div className="role-summary-line">
              <span>Teaching Skill Score</span>
              <strong>{displayScore(tutor.tss, 2)}</strong>
            </div>
            <Progress value={tutor.tss} label="Demo Teaching Skill Score" />
            <div className="role-summary-line">
              <span>Demo tier</span>
              <strong>{tutor.tier}</strong>
            </div>
            <p className="role-caption">
              Illustrative baseline of {tutors[0].tss}/100 and{" "}
              {tutors[0].sessions} sample sessions, updated by this visit’s
              sample evaluations.
            </p>
            <details className="role-ladder-details">
              <summary>How the teaching ladder works</summary>
              <p>
                Helper ≥ 50 · Explainer ≥ 70 · Mentor ≥ 82 and 25 sessions ·
                Village Guide ≥ 90.
              </p>
              <p>
                Three coaching sessions are allowed below a tier’s score before
                demotion. A score below 50 pauses new matches immediately.
              </p>
            </details>
          </section>
          <section className="role-quiet-section">
            <Eyebrow>ONE SMALL TEACHING GOAL</Eyebrow>
            <h3>Let the learner have the last word.</h3>
            <p>“How would you explain this to a friend?”</p>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={data.goal}
                onChange={(event) =>
                  setPreferences({ goal: event.target.checked })
                }
              />
              <span>
                {data.goal
                  ? "Practised in a local lesson"
                  : "I’ve tried this in practice"}
              </span>
            </label>
          </section>
        </aside>
      </div>
      <p className="role-footnote">
        Fictional teaching workspace · no real learner requests, bookings or AI
        analysis.
      </p>
    </div>
  );
}
