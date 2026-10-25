import { useEffect, useRef, useState } from "react";
import { Clock3, LockKeyhole, Search, ShieldCheck, Users } from "lucide-react";
import { Button, ButtonLink, EmptyState, Eyebrow } from "../components/ui";
import { useAccount, type RealAccess } from "../lib/auth/provider";
import type { CurriculumCatalog } from "../domain/curriculum";
import type { Language } from "../domain/types";
import type { Tables } from "../lib/data-access/database.types";
import type { DiscoveryFilters } from "../lib/data-access/discovery-repository";
import { useTutorDiscovery } from "../lib/data-access/use-tutor-discovery";
import { displayScore } from "../domain/learning";
import "./role-dashboards.css";
import "./tutor-discovery.css";
const languages: Language[] = ["English", "हिन्दी", "मराठी", "తెలుగు"];
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const passedLabels: Record<string, string> = {
  adult_test_access: "Provisioned adult test account",
  preview_opt_in: "Tutor opted into this test preview",
  latest_test_approval: "Latest trusted test record is approved",
  verified_grade_sufficient: "Recorded grade meets your requested grade",
  exact_subject_qualification:
    "Trusted qualification for this board, grade and subject",
  qualified_language: "Trusted qualification for your selected language",
  tss_floor_met: "Stored Teaching Skill Score meets the 50-point floor",
};
export function TutorDiscovery() {
  const { account, access } = useAccount();
  if (!account || !access) return null;
  if (!account.roles.includes("learner"))
    return (
      <div className="role-dashboard account-workspace">
        <EmptyState
          title="Adult learner preview only."
          description="Tutor discovery is restricted to provisioned adult learner test accounts. Your current role cannot search other tutors."
        />
      </div>
    );
  return (
    <DiscoveryBootstrap
      key={account.id}
      access={access}
      language={account.profile.preferred_language}
    />
  );
}
function DiscoveryBootstrap({
  access,
  language,
}: {
  access: RealAccess;
  language: Language;
}) {
  const [state, setState] = useState<{
    catalog: CurriculumCatalog;
    enrollments: Tables<"learner_academic_enrollments">[];
  } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([access.curriculum.load(), access.learner.enrollments()])
      .then(([catalog, enrollments]) => {
        if (active) setState({ catalog, enrollments });
      })
      .catch(() => {
        if (active)
          setError(
            "Your academic context could not be loaded. Check your connection and learner access, then retry.",
          );
      });
    return () => {
      active = false;
    };
  }, [access, attempt]);
  if (!state)
    return (
      <div className="role-dashboard account-workspace">
        <Eyebrow>ADULT TEST MATCHING PREVIEW</Eyebrow>
        <h1>Find a learning peer.</h1>
        {error ? (
          <div role="alert">
            <p>{error}</p>
            <Button
              onClick={() => {
                setError("");
                setAttempt((n) => n + 1);
              }}
            >
              Retry academic context
            </Button>
          </div>
        ) : (
          <p role="status">Loading your academic context…</p>
        )}
      </div>
    );
  return (
    <DiscoveryContent
      access={access}
      catalog={state.catalog}
      enrollments={state.enrollments}
      language={language}
    />
  );
}
export function DiscoveryContent({
  access,
  catalog,
  enrollments,
  language: accountLanguage,
}: {
  access: RealAccess;
  catalog: CurriculumCatalog;
  enrollments: Tables<"learner_academic_enrollments">[];
  language: Language;
}) {
  const active = enrollments.find((e) => e.is_active);
  const initialSubject = catalog.subjects.find(
    (s) => s.id === active?.subject_id,
  );
  const initialGrade = catalog.grades.find(
    (g) => g.id === initialSubject?.gradeId,
  );
  const [board, setBoard] = useState<string>(
    initialGrade?.boardId ?? catalog.boards[0]?.id ?? "",
  );
  const [grade, setGrade] = useState(initialGrade?.id ?? "");
  const [subject, setSubject] = useState(initialSubject?.id ?? "");
  const [language, setLanguage] = useState<Language>(
    active?.language ?? accountLanguage,
  );
  const [query, setQuery] = useState("");
  const [weekly, setWeekly] = useState(false);
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("16:00");
  const [end, setEnd] = useState("17:00");
  const [preferenceOnly, setPreferenceOnly] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [formError, setFormError] = useState("");
  const [criteria, setCriteria] = useState<DiscoveryFilters | null>(
    initialSubject
      ? {
          subjectId: initialSubject.id,
          language: active?.language ?? accountLanguage,
          query: "",
          weekday: null,
          startsAt: null,
          endsAt: null,
          preferenceOnly: false,
        }
      : null,
  );
  const ws = useTutorDiscovery(access, dirty ? null : criteria);
  const errorRef = useRef<HTMLDivElement>(null);
  const formErrorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (formError) formErrorRef.current?.focus();
  }, [formError]);
  useEffect(() => {
    if (ws.error) errorRef.current?.focus();
  }, [ws.error]);
  const subjects = catalog.subjects.filter((s) => s.gradeId === grade);
  const markDirty = () => {
    setDirty(true);
    setFormError("");
  };
  function search() {
    if (!subjects.some((s) => s.id === subject)) {
      setFormError("Choose a published board, grade and subject.");
      return;
    }
    if (weekly) {
      const mins = (t: string) =>
        Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
      const duration = mins(end) - mins(start);
      if (
        !/^\d{2}:\d{2}$/.test(start) ||
        !/^\d{2}:\d{2}$/.test(end) ||
        duration < 15 ||
        duration > 240
      ) {
        setFormError(
          "Choose a same-day window of 15 minutes to 4 hours, with start before end.",
        );
        return;
      }
    }
    setFormError("");
    setDirty(false);
    setCriteria({
      subjectId: subject,
      language,
      query: query.trim(),
      weekday: weekly ? weekday : null,
      startsAt: weekly ? start : null,
      endsAt: weekly ? end : null,
      preferenceOnly,
    });
  }
  const data = !dirty ? ws.data : null;
  return (
    <div className="role-dashboard account-workspace real-discovery">
      <header className="role-page-heading discovery-heading">
        <div>
          <Eyebrow>ADULT TEST MATCHING PREVIEW</Eyebrow>
          <h1>
            A little ahead.
            <br />
            <em>Here to help you learn.</em>
          </h1>
          <p className="muted">
            Find a peer through recorded qualifications and a match you can
            understand.
          </p>
        </div>
        <div className="discovery-trust-note">
          <ShieldCheck size={25} />
          <p>
            Test records only.
            <br />
            <span>Real tutoring remains closed.</span>
          </p>
        </div>
      </header>
      <p className="account-release-note">
        <LockKeyhole size={16} />
        This preview is for provisioned adults only. Test approval is not
        physical verification. No requests, bookings or communication are
        available.
      </p>
      <form
        className="discovery-filters"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        aria-label="Tutor discovery filters"
      >
        <div className="discovery-academic-fields">
          <label className="field">
            Academic board
            <select
              value={board}
              onChange={(e) => {
                setBoard(e.target.value);
                setGrade("");
                setSubject("");
                markDirty();
              }}
            >
              {catalog.boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Learner grade
            <select
              required
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value);
                setSubject("");
                markDirty();
              }}
            >
              <option value="">Choose a grade</option>
              {catalog.grades
                .filter((g) => g.boardId === board)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    Grade {g.number}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            Subject
            <select
              required
              value={subject}
              disabled={!subjects.length}
              onChange={(e) => {
                setSubject(e.target.value);
                markDirty();
              }}
            >
              <option value="">
                {subjects.length ? "Choose a subject" : "No published subjects"}
              </option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Language
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value as Language);
                markDirty();
              }}
            >
              {languages.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>
        {grade && !subjects.length && (
          <p className="small muted">
            There are no published subjects for this board and grade yet.
            Another academic context may have coverage.
          </p>
        )}
        <div className="discovery-search-row">
          <label className="field">
            Search test tutor ID
            <div className="discovery-search-input">
              <Search size={17} />
              <input
                value={query}
                maxLength={64}
                onChange={(e) => {
                  setQuery(e.target.value);
                  markDirty();
                }}
                placeholder="e.g. Test tutor or an ID prefix"
              />
            </div>
          </label>
          <label className="field">
            Preference comparison
            <select
              value={weekly ? "weekly" : "now"}
              onChange={(e) => {
                setWeekly(e.target.value === "weekly");
                markDirty();
              }}
            >
              <option value="now">Current IST time</option>
              <option value="weekly">A weekly time window</option>
            </select>
          </label>
        </div>
        {weekly && (
          <div className="discovery-window">
            <label className="field">
              Weekday
              <select
                value={weekday}
                onChange={(e) => {
                  setWeekday(Number(e.target.value));
                  markDirty();
                }}
              >
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <option key={d} value={d}>
                    {days[d]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              From (IST)
              <input
                type="time"
                required
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  markDirty();
                }}
              />
            </label>
            <label className="field">
              Until (IST)
              <input
                type="time"
                required
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  markDirty();
                }}
              />
            </label>
          </div>
        )}
        <div className="discovery-filter-actions">
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={preferenceOnly}
              onChange={(e) => {
                setPreferenceOnly(e.target.checked);
                markDirty();
              }}
            />
            Only matching weekly preferences
          </label>
          <Button type="submit" disabled={!subject || (ws.loading && !dirty)}>
            Search test tutors
          </Button>
        </div>
        <p className="small muted">
          Asia/Kolkata · Saved weekly preferences are self-declared; they do not
          confirm availability for a session. These filters do not change your{" "}
          <ButtonLink to="/settings" variant="ghost">
            saved learning preferences
          </ButtonLink>
          .
        </p>
        {formError && (
          <p
            ref={formErrorRef}
            tabIndex={-1}
            role="alert"
            className="account-feedback"
          >
            {formError}
          </p>
        )}
      </form>
      <section
        className="discovery-results"
        aria-labelledby="discovery-results-title"
        aria-busy={ws.loading && !dirty}
      >
        <div className="role-section-title">
          <h2 id="discovery-results-title">Your matching preview</h2>
          {criteria && (
            <Button
              variant="ghost"
              disabled={ws.loading || dirty}
              onClick={() => void ws.reload()}
            >
              Refresh matches
            </Button>
          )}
        </div>
        {dirty && (
          <p role="status" className="account-feedback">
            Filters changed. Search to update your results.
          </p>
        )}
        {!dirty && ws.loading && (
          <p role="status">Checking current eligibility and ranking…</p>
        )}
        {!dirty && ws.error && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="account-feedback"
          >
            <p>{ws.error}</p>
            <Button variant="outline" onClick={() => void ws.reload()}>
              Retry discovery
            </Button>
          </div>
        )}
        {!criteria && !dirty && (
          <EmptyState
            title="Choose your academic context."
            description="Select a published board, grade and subject to search genuine adult test records. Your saved learner context is used when available."
          />
        )}
        {data && (
          <>
            <p className="discovery-context">
              <strong>
                {
                  catalog.boards.find((b) => b.id === data.context.board_id)
                    ?.name
                }{" "}
                · Grade {data.context.grade} · {data.context.subject} ·{" "}
                {data.context.language}
              </strong>
              <span className="small muted">
                {data.candidates.length} eligible test candidate
                {data.candidates.length === 1 ? "" : "s"} · Ranked by CMS ·
                Checked{" "}
                {new Date(data.as_of).toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}{" "}
                IST
              </span>
            </p>
            <p className="small muted">
              Results describe the latest server check and refresh within a
              minute. Only a test pseudonym and matching facts are shared. They
              do not reserve a tutor.
            </p>
            {data.more_available && (
              <p className="account-feedback">
                Showing the first 24 candidates. Narrow your filters or search a
                test ID to find others.
              </p>
            )}
            {data.candidates.length ? (
              <ol className="discovery-cards">
                {data.candidates.map((candidate, index) => (
                  <li key={candidate.preview_id}>
                    <article className="discovery-card">
                      <div className="discovery-card-heading">
                        <span className="discovery-rank">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <Eyebrow>ADULT TEST CANDIDATE</Eyebrow>
                          <h3>{candidate.label}</h3>
                          <p className="small muted">
                            Recorded eligible grade {candidate.verified_grade} ·
                            Test approval only
                          </p>
                        </div>
                      </div>
                      <div className="discovery-card-scores">
                        <div>
                          <strong>
                            {displayScore(candidate.cms)}
                            <small>/100</small>
                          </strong>
                          <span>Composite Match Score</span>
                        </div>
                        <div>
                          <strong>
                            {displayScore(candidate.teaching_skill_score)}
                            <small>/100</small>
                          </strong>
                          <span>Stored teaching score</span>
                        </div>
                      </div>
                      <p
                        className={`discovery-preference ${candidate.preference_matches ? "matches" : ""}`}
                      >
                        <Clock3 size={16} />
                        {candidate.preference_matches
                          ? `Weekly preference covers ${data.availability_basis === "current_ist_time" ? "the checked IST time" : "your chosen window"}`
                          : candidate.has_weekly_preference
                            ? "Weekly preferences saved; no overlap with this time"
                            : "No enabled weekly preference saved"}
                      </p>
                      <p className="small muted">
                        Self-declared preference · session availability
                        unconfirmed
                      </p>
                      <details>
                        <summary>Why this candidate qualifies</summary>
                        <ul>
                          {candidate.reasons.map((reason) => (
                            <li key={reason}>{passedLabels[reason]}</li>
                          ))}
                        </ul>
                        <p className="small muted">
                          Subject 35 + language 30 + teaching{" "}
                          {displayScore(candidate.factors.teaching * 20)} +
                          preference {candidate.factors.availability * 15} ={" "}
                          {displayScore(candidate.cms)} points. Exact scores
                          determine order; equal scores use the test ID.
                        </p>
                      </details>
                      <div className="discovery-no-booking">
                        <LockKeyhole size={14} />
                        Preview only · participation closed
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="No eligible test tutors match yet."
                description="A candidate needs an explicit preview opt-in, current trusted test approval, the exact subject and language qualifications, sufficient recorded grade, and TSS ≥ 50. Try another published context, clear the ID search or relax the preference-only filter. No sample tutors are substituted."
              />
            )}
          </>
        )}
      </section>
      <aside className="discovery-explainer">
        <Users size={22} />
        <div>
          <h2>A match you can understand.</h2>
          <p>
            35% subject + 30% language + 20% teaching score + 15% weekly
            preference compatibility. Subject and language qualifications are
            required before ranking. Eligibility is decided by the server, using
            the latest test records.
          </p>
          <p className="small muted">
            Trusted physical verification, guardian consent and safety services
            are required before production discovery or participation can open.
          </p>
        </div>
      </aside>
    </div>
  );
}
