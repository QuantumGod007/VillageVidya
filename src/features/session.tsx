import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowRight,
  Send,
  Lightbulb,
  ShieldCheck,
  Wifi,
  WifiOff,
  FileText,
  MessageCircle,
  Flag,
  Check,
  Star,
  MicOff,
  Clock3,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useStore } from "../lib/store";
import { lessons, sampleEvaluation, tutors } from "../data/demo";
import { canTransition, redactContact, sessionScore } from "../domain/learning";
import type { SessionStatus, TimelineEvent } from "../domain/types";
import {
  Avatar,
  Button,
  ButtonLink,
  EmptyState,
  Eyebrow,
  Modal,
} from "../components/ui";
export function SessionRoom() {
  const { id } = useParams();
  const {
    requests,
    completed,
    updateRequest,
    finishSession,
    role,
    online,
    toast,
  } = useStore();
  const match = requests.find((r) => r.id === id);
  const tutor = tutors.find((t) => t.id === match?.tutorId) ?? tutors[0];
  const lesson =
    lessons.find((l) => l.subject === match?.subject) ?? lessons[0];
  const [started] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [status, setStatus] = useState<SessionStatus>("active");
  const [disconnectedAt, setDisconnectedAt] = useState<number | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>(() => [
    {
      id: "welcome",
      at: Date.now(),
      type: "message",
      sender: "tutor",
      text: `Hi Aarav! I’m ${tutor.name}. Today, let’s explore ${lesson.title.toLowerCase()}. What feels a little tricky?`,
    },
  ]);
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [panel, setPanel] = useState("notes");
  const [nudge, setNudge] = useState(false);
  const [ending, setEnding] = useState(false);
  const [report, setReport] = useState(false);
  const [rating, setRating] = useState(0);
  const [typing, setTyping] = useState(false);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const elicCount = events.filter((e) => e.type === "elic").length;
  const elapsed = Math.floor((now - started) / 1000);
  const grace = disconnectedAt
    ? Math.max(0, 180 - Math.floor((now - disconnectedAt) / 1000))
    : 180;
  useEffect(() => {
    if (status === "completed" || status === "terminated") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [status]);
  useEffect(() => {
    if (status === "reconnecting" && grace === 0) setStatus("terminated");
  }, [status, grace]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [events.length, typing]);
  useEffect(
    () => () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (status === "terminated" && match?.status === "accepted")
      updateRequest(match.id, "cancelled");
  }, [status, match?.id, match?.status, updateRequest]);
  if (
    !match ||
    (match.status !== "accepted" && status !== "terminated") ||
    (completed.some((session) => session.id === id) && status !== "completed")
  )
    return (
      <div className="container page">
        <EmptyState
          title="Let’s find your next conversation."
          description="Practice rooms start with an accepted fictional request. Requests stay in memory for this visit."
        >
          <ButtonLink to="/tutors">
            Find a peer tutor <ArrowUpRight size={16} />
          </ButtonLink>
        </EmptyState>
      </div>
    );
  function add(
    type: TimelineEvent["type"],
    sender: TimelineEvent["sender"],
    value: string,
  ) {
    setEvents((p) => [
      ...p,
      {
        id: crypto.randomUUID(),
        at: Date.now(),
        type,
        sender,
        text: redactContact(value),
      },
    ]);
  }
  function transition(next: SessionStatus) {
    if (canTransition(status, next)) setStatus(next);
  }
  function reply(value: string) {
    setTyping(true);
    if (replyTimer.current) clearTimeout(replyTimer.current);
    replyTimer.current = setTimeout(() => {
      add("message", "tutor", value);
      setTyping(false);
    }, 850);
  }
  function send() {
    if (!text.trim() || status !== "active") return;
    if (/\b(kill you|send nudes|meet me alone)\b/i.test(text)) {
      transition("terminated");
      add(
        "system",
        "system",
        "Local safety stop. This practice room has ended. No external alert was sent.",
      );
      setText("");
      return;
    }
    const sanitized = redactContact(text.trim());
    add("message", role === "tutor" ? "tutor" : "learner", sanitized);
    if (sanitized !== text.trim())
      toast("Contact information was removed by the local demo filter.");
    setText("");
    if (role !== "tutor")
      reply(
        `${lesson.concept}\n\n${lesson.steps[0]} What do you notice about that example?`,
      );
  }
  function elic() {
    if (status !== "active") return;
    add("elic", "learner", "ELIC: please try a simpler explanation.");
    setNudge(true);
    reply(
      `Let’s take a familiar example. ${lesson.example} We can go one small step at a time.`,
    );
  }
  function finish() {
    if (!rating) return;
    transition("completed");
    setEnding(false);
    if (replyTimer.current) clearTimeout(replyTimer.current);
    setTyping(false);
    finishSession({
      id: match!.id,
      tutorId: tutor.id,
      topic: lesson.title,
      date: Date.now(),
      minutes: Math.max(1, Math.ceil(elapsed / 60)),
      elic: elicCount,
      rating,
      evaluation: sampleEvaluation,
    });
  }
  if (status === "completed")
    return (
      <div className="container page session-summary">
        <span className="summary-check">
          <CheckCircle2 size={32} strokeWidth={1.3} />
        </span>
        <Eyebrow>A LITTLE MORE UNDERSTOOD</Eyebrow>
        <h1>
          Small lesson.
          <br />
          <em>Real room to grow.</em>
        </h1>
        <p>Your local practice session with {tutor.name} is complete.</p>
        <div className="summary-stats">
          <div>
            <strong>{Math.max(1, Math.ceil(elapsed / 60))}</strong>
            <span>minutes of practice</span>
          </div>
          <div>
            <strong>{elicCount}</strong>
            <span>times you asked another way</span>
          </div>
          <div>
            <strong>{rating}/5</strong>
            <span>your session rating</span>
          </div>
        </div>
        <div className="summary-note">
          <h2>Take the idea with you.</h2>
          <p>{lesson.concept}</p>
          {notes && (
            <>
              <h3>Your session note</h3>
              <p>{notes}</p>
            </>
          )}
          <span className="small muted">
            Notes and transcript are kept in memory only. Demo session metadata
            lasts for this visit.
          </span>
        </div>
        <div className="summary-actions">
          <ButtonLink to={`/lesson/${lesson.id}`}>
            Check my understanding <ArrowRight size={16} />
          </ButtonLink>
          <ButtonLink
            to={role === "tutor" ? "/studio/feedback" : "/learn"}
            variant="outline"
          >
            Back to my space <ArrowUpRight size={16} />
          </ButtonLink>
        </div>
        <p className="small muted">
          Sample Co-Teacher score: {sessionScore(sampleEvaluation).toFixed(1)}
          /100. This is illustrative, not analysis of your conversation.
        </p>
      </div>
    );
  return (
    <div className="session-page">
      <div className="container session-breadcrumb">
        <Link to="/sessions">
          <ArrowLeft size={15} />
          My sessions
        </Link>
        <span>LOCAL PRACTICE ROOM · NO CROSS-DEVICE MESSAGING</span>
      </div>
      <div className="container session-shell">
        <div className="session-top">
          <div>
            <Avatar name={tutor.name} color={tutor.color} />
            <div>
              <h1>{lesson.title}</h1>
              <p>
                Aarav & {tutor.name} <span>·</span>
                {match.subject}
                <span>·</span>Grade {lesson.grade} foundations
              </p>
            </div>
          </div>
          <div className="session-status">
            <span
              className={
                status === "reconnecting"
                  ? "connection reconnecting"
                  : "connection"
              }
            >
              {status === "reconnecting" ? (
                <WifiOff size={14} />
              ) : (
                <Wifi size={14} />
              )}{" "}
              {status === "reconnecting"
                ? "Reconnection practice"
                : online
                  ? "Local demo connected"
                  : "Offline local practice"}
            </span>
            <span className="timer">
              <Clock3 size={15} />
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
              {String(elapsed % 60).padStart(2, "0")}
            </span>
          </div>
        </div>
        <div className="session-body">
          <section
            className="chat-workspace"
            aria-label="Tutoring conversation"
          >
            <div className="session-trust-note">
              <ShieldCheck size={14} />
              <span>
                Fictional tutor. Curated replies. Contact sharing is filtered
                locally.
              </span>
            </div>
            {status === "reconnecting" && (
              <div className="reconnect-note" role="status">
                <WifiOff size={20} />
                <div>
                  <strong>
                    A little pause. Your conversation is still here.
                  </strong>
                  <p>
                    {Math.floor(grace / 60)}:
                    {String(grace % 60).padStart(2, "0")} left in the 3-minute
                    reconnection practice.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    transition("active");
                    setDisconnectedAt(null);
                    add("system", "system", "Practice connection restored.");
                  }}
                >
                  Reconnect
                </Button>
              </div>
            )}
            {status === "terminated" && (
              <div className="safety-stop" role="alert">
                <ShieldCheck size={22} />
                <div>
                  <strong>This local practice session has ended.</strong>
                  <p>
                    Messages are disabled. No real account or external contact
                    was involved.
                  </p>
                  <Link className="text-link" to="/tutors">
                    Find another practice session
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </div>
            )}
            <div
              className="chat-messages"
              role="log"
              aria-live="polite"
              aria-label="Session timeline"
            >
              <div className="chat-day-label">
                A SMALL MOMENT OF LEARNING · TODAY
              </div>
              {events.map((event) =>
                event.type === "message" ? (
                  <div
                    className={`chat-message ${event.sender}`}
                    key={event.id}
                  >
                    <Avatar
                      name={event.sender === "tutor" ? tutor.name : "Aarav"}
                      color={event.sender === "tutor" ? tutor.color : "sage"}
                    />
                    <div>
                      <span>
                        {event.sender === "tutor" ? tutor.name : "You"}
                        <time dateTime={new Date(event.at).toISOString()}>
                          {new Date(event.at).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </time>
                      </span>
                      <p>{event.text}</p>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`timeline-event ${event.type}`}
                    key={event.id}
                  >
                    {event.type === "elic" ? (
                      <Lightbulb size={15} />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    <span>{event.text}</span>
                    <time>
                      {new Date(event.at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                ),
              )}
              {typing && (
                <div className="typing-note" role="status">
                  {tutor.name} is preparing a sample explanation{" "}
                  <span>···</span>
                </div>
              )}
              <div ref={bottom} />
            </div>
            <div className="chat-bottom">
              <button
                disabled={status !== "active" || typing}
                className="elic-button"
                onClick={elic}
              >
                <Lightbulb size={18} />
                I’m confused. Try another way.<span>ELIC</span>
              </button>
              <form
                className="chat-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <label className="sr-only" htmlFor="session-message">
                  Your message
                </label>
                <input
                  id="session-message"
                  placeholder="Every question is welcome here…"
                  value={text}
                  maxLength={1000}
                  onChange={(e) => setText(e.target.value)}
                  disabled={status !== "active"}
                />
                <button
                  className="send-button"
                  aria-label="Send message"
                  disabled={!text.trim() || status !== "active" || typing}
                >
                  <Send size={18} />
                </button>
              </form>
              <div className="chat-composer-footer">
                <span>
                  <MicOff size={13} />
                  Text-first practice · audio is not connected
                </span>
                <button onClick={() => setReport(true)}>
                  <Flag size={13} />
                  Report a concern
                </button>
              </div>
            </div>
          </section>
          <aside className="session-aside">
            <div className="session-panel-tabs">
              <button
                className={panel === "notes" ? "active" : ""}
                onClick={() => setPanel("notes")}
              >
                <FileText size={16} />
                Our notes
              </button>
              <button
                className={panel === "lesson" ? "active" : ""}
                onClick={() => setPanel("lesson")}
              >
                <MessageCircle size={16} />
                The idea
              </button>
            </div>
            {nudge && (
              <div className="tutor-nudge" role="status">
                <Lightbulb size={21} />
                <strong>Your learner is a little stuck.</strong>
                <p>
                  Try one familiar analogy, then ask them to explain it back.
                </p>
                <button className="text-link" onClick={() => setNudge(false)}>
                  Nudge received <Check size={14} />
                </button>
              </div>
            )}
            {panel === "notes" ? (
              <div className="session-notes">
                <Eyebrow>KEEP WHAT CLICKS</Eyebrow>
                <p>A little space to make the idea your own.</p>
                <textarea
                  aria-label="Session notes"
                  value={notes}
                  maxLength={3000}
                  onChange={(e) => setNotes(redactContact(e.target.value))}
                  placeholder="The example that helped me…"
                />
                <span>
                  Local notes · visible only on this device · discarded after
                  leaving
                </span>
              </div>
            ) : (
              <div className="session-lesson">
                <Eyebrow>ONE IDEA TO TAKE AWAY</Eyebrow>
                <h2>{lesson.title}</h2>
                <p>{lesson.concept}</p>
                <Link className="text-link" to={`/lesson/${lesson.id}`}>
                  Read the whole note
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            )}
            <div className="session-controls">
              <button
                className="text-link"
                disabled={status !== "active"}
                onClick={() => {
                  setDisconnectedAt(Date.now());
                  transition("reconnecting");
                  add(
                    "system",
                    "system",
                    "Started a local reconnection exercise.",
                  );
                }}
              >
                <RefreshCw size={15} />
                Practice a connection drop
              </button>
              <Button
                variant="outline"
                className="full-width"
                onClick={() => setEnding(true)}
                disabled={status === "terminated"}
              >
                Finish our session <ArrowUpRight size={16} />
              </Button>
            </div>
          </aside>
        </div>
      </div>
      <Modal
        open={ending}
        onClose={() => setEnding(false)}
        title="How did the little lesson feel?"
      >
        <p className="muted">
          Your feedback helps complete this fictional practice session.
        </p>
        <div
          className="rating-buttons"
          role="group"
          aria-label="Rate the session from one to five"
        >
          {[1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              aria-label={`${r} ${r === 1 ? "star" : "stars"}`}
              aria-pressed={rating === r}
              onClick={() => setRating(r)}
            >
              <Star
                size={30}
                fill={rating >= r ? "#F2A65A" : "none"}
                stroke={rating >= r ? "#a56322" : "#888b8c"}
              />
            </button>
          ))}
        </div>
        <Button className="full-width" onClick={finish} disabled={!rating}>
          Complete practice session <Check size={17} />
        </Button>
      </Modal>
      <Modal
        open={report}
        onClose={() => setReport(false)}
        title="Your comfort comes first."
      >
        <p className="muted">
          You can stop this local session now. A production report would go to
          your Local Champion; this demo does not send any external alert.
        </p>
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setReport(false)}>
            Return to the lesson
          </Button>
          <Button
            variant="ink"
            onClick={() => {
              transition("terminated");
              if (replyTimer.current) clearTimeout(replyTimer.current);
              setTyping(false);
              add(
                "system",
                "system",
                "Session stopped by the learner. Demo report noted locally.",
              );
              setReport(false);
            }}
          >
            Stop this practice session
          </Button>
        </div>
      </Modal>
    </div>
  );
}
export function Sessions() {
  const { requests, completed, updateRequest } = useStore();
  const [tab, setTab] = useState("upcoming");
  const upcoming = requests.filter(
    (r) => r.status === "accepted" && !completed.some((c) => c.id === r.id),
  );
  return (
    <div className="workspace-page">
      <div className="page-heading">
        <Eyebrow>TIME WELL SPENT, TOGETHER</Eyebrow>
        <h1>
          Your learning
          <br />
          <em>conversations.</em>
        </h1>
        <p>A little space to plan what’s next and remember what clicked.</p>
      </div>
      <div className="filter-tabs">
        <button
          className={tab === "upcoming" ? "active" : ""}
          onClick={() => setTab("upcoming")}
        >
          Upcoming & active ({upcoming.length})
        </button>
        <button
          className={tab === "completed" ? "active" : ""}
          onClick={() => setTab("completed")}
        >
          Completed ({completed.length})
        </button>
      </div>
      {tab === "upcoming" ? (
        upcoming.length ? (
          <div className="session-list">
            {upcoming.map((r) => {
              const t = tutors.find((t) => t.id === r.tutorId) ?? tutors[0];
              return (
                <article key={r.id} className="session-list-item">
                  <Avatar name={t.name} color={t.color} size="large" />
                  <div>
                    <Eyebrow>
                      {r.subject.toUpperCase()} · FICTIONAL SESSION
                    </Eyebrow>
                    <h2>{r.topic}</h2>
                    <p>
                      With {t.name} ·{" "}
                      {r.scheduled
                        ? `${r.scheduled} IST`
                        : "Ready for local practice"}
                    </p>
                  </div>
                  <ButtonLink to={`/room/${r.id}`} variant="outline">
                    {r.scheduled ? "Preview practice room" : "Join practice"}
                    <ArrowUpRight size={16} />
                  </ButtonLink>
                  <Button
                    variant="ghost"
                    onClick={() => updateRequest(r.id, "cancelled")}
                  >
                    Cancel
                  </Button>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Good conversations start somewhere."
            description="Find a peer and accept a fictional match to plan your next lesson."
          >
            <ButtonLink to="/tutors">
              Find your peer <ArrowUpRight size={16} />
            </ButtonLink>
          </EmptyState>
        )
      ) : completed.length ? (
        <div className="session-list">
          {completed.map((c) => (
            <article className="session-list-item" key={c.id}>
              <span className="completed-session-icon">
                <Check size={24} />
              </span>
              <div>
                <Eyebrow>LOCAL PRACTICE COMPLETE</Eyebrow>
                <h2>{c.topic}</h2>
                <p>
                  {c.minutes} min · {c.elic} ELIC nudges · {c.rating}/5 rating
                </p>
              </div>
              <ButtonLink to="/explore" variant="outline">
                Keep learning <ArrowUpRight size={16} />
              </ButtonLink>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Your story is still being written."
          description="Completed practice sessions will appear here during this visit."
        />
      )}
      <p className="small muted session-list-note">
        Session and request metadata stay in memory for this visit. Nothing is
        booked with a real person.
      </p>
    </div>
  );
}
