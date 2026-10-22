import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  ShieldCheck,
  Clock3,
  Check,
  SlidersHorizontal,
  X,
  Sparkles,
  CalendarDays,
  Users,
  CircleCheck,
  Timer,
} from "lucide-react";
import { tutors } from "../data/demo";
import { useTutorCatalog } from "../lib/use-tutors";
import { rankTutors, calculateMatch, MATCH_WEIGHTS } from "../domain/learning";
import type { Tutor, Subject, Language, MatchRequest } from "../domain/types";
import { useStore } from "../lib/store";
import {
  Avatar,
  Button,
  EmptyState,
  Eyebrow,
  Modal,
  Progress,
} from "../components/ui";
import {
  lessonsFor,
  readAcademicContext,
  type LearnerGrade,
} from "../domain/curriculum";
import { lessons } from "../data/demo";
import { curriculum } from "../data/curriculum";
const subjectList: Subject[] = [
  "Mathematics",
  "Science",
  "English",
  "Social Science",
];
export function Tutors() {
  const [params, setParams] = useSearchParams();
  const store = useStore();
  const navigate = useNavigate();
  const catalog = useTutorCatalog();
  const [query, setQuery] = useState("");
  const incoming = readAcademicContext(params, store.data);
  const [language, setLanguage] = useState<Language>(incoming.language);
  const [grade, setGrade] = useState<LearnerGrade>(incoming.grade);
  const [available, setAvailable] = useState(false);
  const [sort, setSort] = useState("match");
  const [profile, setProfile] = useState<Tutor | null>(null);
  const [request, setRequest] = useState<MatchRequest | null>(null);
  const [slot, setSlot] = useState("");
  const subject = incoming.subject;
  const academic = { ...incoming, grade, language, subject };
  const library = lessonsFor(lessons, academic);
  const selectedLesson = library.find((l) => l.id === params.get("lesson"));
  const ranked = rankTutors(catalog, grade, subject, language);
  const filtered = ranked
    .filter(
      (x) =>
        (!available || x.tutor.available) &&
        `${x.tutor.name} ${x.tutor.bio}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "score" ? b.tutor.tss - a.tutor.tss : b.score - a.score,
    );
  function start(tutor: Tutor, scheduled?: string) {
    if (store.role !== "learner") {
      navigate("/login?role=learner");
      return;
    }
    setProfile(null);
    setRequest(
      store.request(
        tutor.id,
        subject,
        selectedLesson?.title ?? `Grade ${grade} ${subject} · open question`,
        scheduled,
        { academic, lessonId: selectedLesson?.id },
      ),
    );
  }
  return (
    <div className="container page tutors-page">
      <div className="page-heading tutor-page-heading">
        <div>
          <Eyebrow>YOUR KIND OF TEACHER IS OUT THERE</Eyebrow>
          <h1>
            A little ahead.
            <br />
            <em>Right here with you.</em>
          </h1>
          <p>
            A peer who knows the subject. A person who understands the question.
          </p>
        </div>
        <div className="tutor-heading-note">
          <ShieldCheck size={24} strokeWidth={1.3} />
          <p>
            Trust comes first.
            <br />
            <span>All tutor profiles below are fictional.</span>
          </p>
        </div>
      </div>
      <p className="academic-coverage">
        Seeking help for{" "}
        {curriculum.boards.find((b) => b.id === academic.boardId)?.name} · Grade{" "}
        {grade} · {subject} · {language}
        {selectedLesson ? ` · ${selectedLesson.title}` : " · open question"}.
        Tutor grade eligibility is checked separately; board expertise is not
        verified in this demo.
      </p>
      <div className="tutor-filters">
        <label className="search-input">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a familiar kind of help"
            aria-label="Search tutors"
          />
        </label>
        <label className="compact-field">
          Subject
          <select
            value={subject}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.set("subject", e.target.value);
              next.delete("lesson");
              setParams(next);
            }}
          >
            {subjectList.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          Your grade
          <select
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value) as LearnerGrade)}
          >
            {Array.from({ length: 7 }, (_, i) => (
              <option value={i + 4} key={i}>
                Grade {i + 4}
              </option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          Language
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            {["English", "हिन्दी", "मराठी", "తెలుగు"].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="tutor-results-toolbar">
        <div>
          <span>
            {filtered.length} thoughtful{" "}
            {filtered.length === 1 ? "match" : "matches"}
          </span>
          <span className="muted">for your next small step</span>
        </div>
        <div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            Available now
          </label>
          <label className="sort-select">
            <SlidersHorizontal size={14} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort tutors"
            >
              <option value="match">Best match</option>
              <option value="score">Teaching score</option>
            </select>
          </label>
        </div>
      </div>
      {filtered.length ? (
        <div className="tutor-grid">
          {filtered.map(({ tutor, score }, i) => (
            <article className="tutor-card" key={tutor.id}>
              <div className={`tutor-card-visual ${tutor.color}`}>
                <span className="tutor-tier">{tutor.tier}</span>
                <Avatar name={tutor.name} color={tutor.color} size="portrait" />
                <span className="tutor-card-number">
                  {String(i + 1).padStart(2, "0")} / YOUR LEARNING PEOPLE
                </span>
                <span className="portrait-star" aria-hidden="true">
                  ✳
                </span>
              </div>
              <div className="tutor-card-body">
                <div className="tutor-name">
                  <h2>
                    {tutor.name}
                    <ShieldCheck size={18} />
                  </h2>
                  <span
                    className={`availability ${tutor.available ? "" : "later"}`}
                  >
                    <i />
                    {tutor.available ? "Available now" : "Back tomorrow"}
                  </span>
                </div>
                <p className="tutor-academics">
                  Grade {tutor.grade} · {tutor.subjects.join(" & ")}
                </p>
                <p className="tutor-bio">{tutor.bio}</p>
                <div className="tutor-languages">
                  {tutor.languages.map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                </div>
                <div className="tutor-score-row">
                  <div>
                    <strong>
                      {Number(tutor.tss.toFixed(1))}
                      <span>/100</span>
                    </strong>
                    <small>Teaching Skill Score</small>
                  </div>
                  <div className="match-score">
                    <strong>{Math.round(score)}%</strong>
                    <small>calculated match</small>
                  </div>
                </div>
                <div className="match-reason">
                  <Sparkles size={14} />
                  <span>
                    {tutor.languages.includes(language)
                      ? `Your subject. Your language. ${tutor.available ? "Your time." : "A time to plan."}`
                      : "Your subject. A new language connection."}
                  </span>
                </div>
                <Button
                  className="full-width"
                  variant="outline"
                  onClick={() => {
                    setProfile(tutor);
                    setSlot(tutor.slots[0]);
                  }}
                >
                  Meet {tutor.name}
                  <ArrowUpRight size={16} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="The right person is worth finding."
          description="No eligible peers match these filters. Try another language or time, or explore a sample explanation."
        >
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setAvailable(false);
            }}
          >
            Reset filters
          </Button>
          <Button
            onClick={() => {
              store.setPreferences(academic);
              navigate("/assistant");
            }}
          >
            Ask about Grade {grade} {subject} <Sparkles size={16} />
          </Button>
        </EmptyState>
      )}
      <div className="matching-explainer">
        <div>
          <Users size={22} />
          <h2>A match you can understand.</h2>
        </div>
        <p>
          35% subject + 30% language + 20% teaching score + 15% availability.
          Tutors must be verified, meet TSS ≥ 50, and teach at or below their
          verified grade. All checks here operate on fictional profiles.
        </p>
      </div>
      <Modal
        open={!!profile}
        onClose={() => setProfile(null)}
        title={profile ? `A little about ${profile.name}.` : "Meet your peer"}
        wide
      >
        {profile && (
          <div className="profile-detail">
            <div className="profile-detail-intro">
              <Avatar name={profile.name} color={profile.color} size="large" />
              <div>
                <Eyebrow>
                  {profile.tier.toUpperCase()} · GRADE {profile.grade}
                </Eyebrow>
                <p>{profile.bio}</p>
                <span className="verified-label">
                  <ShieldCheck size={14} />
                  Fictional Champion verification
                </span>
              </div>
            </div>
            <div className="profile-detail-grid">
              <section>
                <h3>How I like to teach</h3>
                <p>{profile.approach}</p>
                <h3>Why this match makes sense</h3>
                <div className="match-breakdown">
                  {Object.entries(
                    calculateMatch(profile, subject, language).factors,
                  ).map(([key, value]) => (
                    <div key={key}>
                      <span>
                        {key === "teaching"
                          ? "Teaching quality"
                          : key[0].toUpperCase() + key.slice(1)}
                        <small>
                          {MATCH_WEIGHTS[key as keyof typeof MATCH_WEIGHTS] *
                            100}
                          % weight
                        </small>
                      </span>
                      <Progress
                        value={value * 100}
                        label={`${key} compatibility`}
                      />
                      <strong>{Math.round(value * 100)}%</strong>
                    </div>
                  ))}
                </div>
                <p className="small muted">
                  A{" "}
                  {calculateMatch(profile, subject, language).score.toFixed(1)}%
                  match for Grade {grade} {subject} in {language}.
                </p>
              </section>
              <section className="profile-booking">
                <Eyebrow>A LITTLE TIME, WELL SPENT</Eyebrow>
                <h3>Let’s figure it out together.</h3>
                <p>A 30-minute text-first practice session.</p>
                {profile.available && (
                  <Button className="full-width" onClick={() => start(profile)}>
                    Request a demo session <ArrowRight size={16} />
                  </Button>
                )}
                <label className="field">
                  Or choose a sample time
                  <select
                    value={slot}
                    onChange={(e) => setSlot(e.target.value)}
                  >
                    {profile.slots.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <Button
                  className="full-width"
                  variant="outline"
                  onClick={() => start(profile, slot)}
                >
                  <CalendarDays size={16} />
                  Plan a demo session
                </Button>
                <p className="small muted">
                  Times are illustrative IST slots. No real tutor is contacted.
                </p>
              </section>
            </div>
          </div>
        )}
      </Modal>
      {request && (
        <MatchFlow
          key={request.id}
          initial={request}
          candidates={ranked
            .filter((x) => x.tutor.available)
            .map((x) => x.tutor)}
          onClose={() => setRequest(null)}
        />
      )}
    </div>
  );
}
function MatchFlow({
  initial,
  candidates,
  onClose,
}: {
  initial: MatchRequest;
  candidates: Tutor[];
  onClose: () => void;
}) {
  const { requests, request, updateRequest, setPreferences } = useStore();
  const [activeId, setActiveId] = useState(initial.id);
  const [now, setNow] = useState(Date.now());
  const [tried, setTried] = useState([initial.tutorId]);
  const [fallback, setFallback] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const navigate = useNavigate();
  const active = requests.find((r) => r.id === activeId) ?? initial;
  const tutor = tutors.find((t) => t.id === active.tutorId) ?? tutors[0];
  const remaining = Math.max(
    0,
    45 - Math.floor((now - active.createdAt) / 1000),
  );
  useEffect(() => {
    if (active.status !== "pending" || fallback) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [active.status, fallback]);
  useEffect(() => {
    if (active.status === "pending" && now - active.createdAt >= 45_000)
      updateRequest(active.id, "expired");
    if (active.status === "pending" && now - initial.createdAt >= 90_000) {
      updateRequest(active.id, "expired");
      setFallback(true);
    }
  }, [now, active, initial.createdAt, updateRequest]);
  useEffect(() => {
    if (!["expired", "declined"].includes(active.status) || fallback) return;
    if (initial.scheduled) {
      setFallback(true);
      return;
    }
    const next = candidates.find((t) => !tried.includes(t.id));
    if (!next || Date.now() - initial.createdAt >= 90_000) {
      setFallback(true);
      return;
    }
    setHistory((p) => [
      ...p,
      `${tutor.name}: ${active.status}. Trying the next compatible peer.`,
    ]);
    const nextRequest = request(
      next.id,
      initial.subject,
      initial.topic,
      undefined,
      initial.academic
        ? { academic: initial.academic, lessonId: initial.lessonId }
        : undefined,
    );
    setTried((p) => [...p, next.id]);
    setActiveId(nextRequest.id);
  }, [
    active.status,
    initial,
    candidates,
    tried,
    fallback,
    request,
    tutor.name,
  ]);
  return (
    <Modal
      open
      onClose={() => {
        if (active.status === "pending") updateRequest(active.id, "cancelled");
        onClose();
      }}
      title={
        fallback
          ? "Let’s try another way."
          : active.status === "accepted"
            ? "A little connection, made."
            : "Finding your learning moment."
      }
    >
      <div className="match-flow">
        {fallback ? (
          <>
            <Sparkles size={34} strokeWidth={1.3} />
            <h3>No sample tutor accepted this request.</h3>
            <p>
              The live matching design waits up to 45 seconds per peer, with a
              90-second overall limit. Explore a curated explanation or try
              another time.
            </p>
            <Button
              onClick={() => {
                if (initial.academic) setPreferences(initial.academic);
                navigate("/assistant");
              }}
            >
              Ask about Grade {initial.academic?.grade ?? "—"} {initial.subject}{" "}
              <ArrowUpRight size={16} />
            </Button>
          </>
        ) : active.status === "accepted" ? (
          <>
            <CircleCheck className="blue-text" size={38} strokeWidth={1.4} />
            <h3>{tutor.name} is part of your next step.</h3>
            <p>
              {active.scheduled
                ? `Your fictional session is planned for ${active.scheduled} IST.`
                : "Your local practice room is ready. Try a conversation and the ELIC nudge."}
            </p>
            <Button
              onClick={() => {
                onClose();
                navigate(active.scheduled ? "/sessions" : `/room/${active.id}`);
              }}
            >
              {active.scheduled ? "View my sessions" : "Enter practice room"}
              <ArrowUpRight size={16} />
            </Button>
          </>
        ) : (
          <>
            <Avatar name={tutor.name} color={tutor.color} size="large" />
            <Eyebrow>LOCAL MATCH SIMULATION</Eyebrow>
            <h3>A little time with {tutor.name}.</h3>
            <p>
              {initial.scheduled
                ? `${initial.scheduled} IST`
                : "No real tutor is contacted. Choose a response to test the matching flow."}
            </p>
            <div className="match-countdown">
              <Timer size={17} />
              <span>{remaining}s remaining on this invitation</span>
            </div>
            <div className="match-flow-actions">
              <Button onClick={() => updateRequest(active.id, "accepted")}>
                <Check size={16} />
                Simulate acceptance
              </Button>
              <Button
                variant="outline"
                onClick={() => updateRequest(active.id, "declined")}
              >
                <X size={15} />
                Simulate decline
              </Button>
            </div>
            <button
              className="text-link"
              onClick={() => updateRequest(active.id, "expired")}
            >
              <Clock3 size={14} />
              Simulate timeout
            </button>
          </>
        )}
        {history.length > 0 && (
          <div className="match-history" role="status">
            {history.map((h) => (
              <p key={h}>{h}</p>
            ))}
          </div>
        )}
        <p className="small muted">
          This is a fictional interaction on this device. Request state lasts
          for this visit.
        </p>
      </div>
    </Modal>
  );
}
