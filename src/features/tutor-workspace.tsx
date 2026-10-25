import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarDays, LockKeyhole } from "lucide-react";
import { Button, ButtonLink, EmptyState, Eyebrow } from "../components/ui";
import { useAccount, type RealAccess } from "../lib/auth/provider";
import { useTutorWorkspace } from "../lib/data-access/use-tutor-workspace";
import type { AvailabilityInput } from "../lib/data-access/tutor-repository";
import type { Tables } from "../lib/data-access/database.types";
import "./role-dashboards.css";
import "./tutor-workspace.css";
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const week = [1, 2, 3, 4, 5, 6, 0];
export function verificationLabel(status?: string) {
  return (
    (
      {
        pending: "Pending trusted review",
        approved: "Approved in test records",
        rejected: "Rejected in test records",
        revoked: "Revoked in test records",
      } as Record<string, string>
    )[status ?? ""] ?? "Verification not started"
  );
}
export function validateInterval(
  input: Pick<AvailabilityInput, "weekday" | "starts_at" | "ends_at">,
  saved: Tables<"tutor_availability">[],
  id?: string,
) {
  const minute = (time: string) =>
    /^\d{2}:\d{2}$/.test(time)
      ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
      : NaN;
  const start = minute(input.starts_at),
    end = minute(input.ends_at);
  if (
    !Number.isInteger(input.weekday) ||
    input.weekday < 0 ||
    input.weekday > 6 ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end > 1439 ||
    Number(input.starts_at.slice(3)) > 59 ||
    Number(input.ends_at.slice(3)) > 59 ||
    end <= start
  )
    return "Choose valid times with start before end on the same day.";
  if (end - start < 15 || end - start > 240)
    return "Each interval must last 15 minutes to 4 hours.";
  const others = saved.filter((s) => s.id !== id);
  if (
    others.some(
      (s) =>
        s.weekday === input.weekday &&
        input.starts_at < s.ends_at.slice(0, 5) &&
        input.ends_at > s.starts_at.slice(0, 5),
    )
  )
    return "This interval overlaps a saved interval, including disabled intervals.";
  if (
    others.length >= 28 ||
    others.filter((s) => s.weekday === input.weekday).length >= 4
  )
    return "Save at most 4 intervals per day and 28 per week.";
  return "";
}
function Biography({
  profile,
  disabled,
  pending,
  save,
}: {
  profile: Tables<"tutor_profiles">;
  disabled: boolean;
  pending: boolean;
  save: (bio: string) => Promise<boolean>;
}) {
  const [bio, setBio] = useState(profile.bio);
  return (
    <form
      className="tutor-bio"
      onSubmit={(e) => {
        e.preventDefault();
        void save(bio);
      }}
    >
      <label className="field">
        Teaching biography
        <textarea
          value={bio}
          maxLength={1200}
          rows={5}
          disabled={disabled}
          onChange={(e) => setBio(e.target.value)}
          aria-describedby="bio-help"
        />
      </label>
      <p id="bio-help" className="small muted">
        {Array.from(bio).length}/1200 characters. Tell us about your teaching
        interests. This does not award a qualification.
      </p>
      <Button
        type="submit"
        disabled={disabled || bio.trim() === profile.bio}
        aria-busy={pending}
      >
        {pending ? "Saving biography…" : "Save biography"}
      </Button>
    </form>
  );
}
function AvailabilityEditor({
  saved,
  disabled,
  pending,
  save,
  remove,
}: {
  saved: Tables<"tutor_availability">[];
  disabled: boolean;
  pending: string;
  save: (input: AvailabilityInput) => Promise<boolean>;
  remove: (row: Tables<"tutor_availability">) => Promise<boolean>;
}) {
  const blank = (): AvailabilityInput => ({
    id: crypto.randomUUID(),
    revision: null,
    weekday: 1,
    starts_at: "16:00",
    ends_at: "17:00",
    enabled: true,
  });
  const [draft, setDraft] = useState<AvailabilityInput>(blank);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState("");
  const form = useRef<HTMLFormElement>(null);
  function reset() {
    setDraft(blank());
    setError("");
  }
  return (
    <section className="role-section" id="schedule" tabIndex={-1}>
      <div className="role-section-title">
        <h2>Weekly availability</h2>
        <CalendarDays size={20} />
      </div>
      <p className="small muted">
        Asia/Kolkata (IST, UTC+05:30). Saved weekly preferences, with no
        appointments or live bookings. 15 minutes–4 hours per interval; up to 4
        per day and 28 per week. Disabled intervals also reserve their place in
        this schedule.
      </p>
      <ol className="tutor-week">
        {week.map((day) => (
          <li key={day} className="tutor-day">
            <h3>{days[day]}</h3>
            <div>
              {!saved.some((s) => s.weekday === day) && (
                <p className="small muted">No availability saved</p>
              )}
              {saved
                .filter((s) => s.weekday === day)
                .map((row) => (
                  <div className="tutor-slot" key={row.id}>
                    <div>
                      <strong>
                        {row.starts_at.slice(0, 5)}–{row.ends_at.slice(0, 5)}
                      </strong>
                      <span className="small muted">
                        {row.enabled
                          ? "Enabled preference"
                          : "Disabled preference"}
                      </span>
                    </div>
                    <div className="tutor-slot-actions">
                      <Button
                        variant="ghost"
                        disabled={disabled}
                        aria-label={`Edit ${days[day]} ${row.starts_at.slice(0, 5)}`}
                        onClick={() => {
                          setDraft({
                            ...row,
                            starts_at: row.starts_at.slice(0, 5),
                            ends_at: row.ends_at.slice(0, 5),
                          });
                          setError("");
                          form.current?.scrollIntoView({ block: "start" });
                          form.current?.focus({ preventScroll: true });
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={disabled}
                        aria-label={`${row.enabled ? "Disable" : "Enable"} ${days[day]} ${row.starts_at.slice(0, 5)}`}
                        onClick={() =>
                          void save({ ...row, enabled: !row.enabled })
                        }
                      >
                        {pending === row.id
                          ? "Saving…"
                          : row.enabled
                            ? "Disable"
                            : "Enable"}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={disabled}
                        aria-label={`Remove ${days[day]} ${row.starts_at.slice(0, 5)}`}
                        onClick={() => setDeleting(row.id)}
                      >
                        Remove
                      </Button>
                    </div>
                    {deleting === row.id && (
                      <div
                        className="tutor-delete"
                        role="group"
                        aria-label="Confirm removal"
                      >
                        <p>Remove this weekly interval?</p>
                        <Button
                          variant="outline"
                          disabled={disabled}
                          onClick={async () => {
                            if (await remove(row)) {
                              setDeleting("");
                              if (draft.id === row.id) reset();
                            }
                          }}
                        >
                          Confirm removal
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={disabled}
                          onClick={() => setDeleting("")}
                        >
                          Keep interval
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </li>
        ))}
      </ol>
      <form
        ref={form}
        tabIndex={-1}
        aria-label="Weekly interval editor"
        className="tutor-interval-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const message = validateInterval(draft, saved, draft.id);
          setError(message);
          if (!message && (await save(draft))) reset();
        }}
      >
        <h3>
          {draft.revision === null
            ? "Add a weekly interval"
            : "Edit weekly interval"}
        </h3>
        <div className="tutor-time-fields">
          <label className="field">
            Day
            <select
              value={draft.weekday}
              disabled={disabled}
              onChange={(e) =>
                setDraft({ ...draft, weekday: Number(e.target.value) })
              }
            >
              {week.map((d) => (
                <option key={d} value={d}>
                  {days[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Start time
            <input
              type="time"
              required
              step="60"
              value={draft.starts_at}
              disabled={disabled}
              onChange={(e) =>
                setDraft({ ...draft, starts_at: e.target.value })
              }
            />
          </label>
          <label className="field">
            End time
            <input
              type="time"
              required
              step="60"
              value={draft.ends_at}
              disabled={disabled}
              onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })}
            />
          </label>
        </div>
        <label className="tutor-enabled">
          <input
            type="checkbox"
            checked={draft.enabled}
            disabled={disabled}
            onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
          />{" "}
          Enable this saved preference
        </label>
        <p className="small muted">
          Enabling a preference does not make you discoverable or bookable.
        </p>
        {error && (
          <p role="alert" className="account-feedback">
            {error}
          </p>
        )}
        <div className="tutor-form-actions">
          <Button
            type="submit"
            disabled={disabled}
            aria-busy={pending === draft.id}
          >
            {pending === draft.id
              ? "Saving interval…"
              : draft.revision === null
                ? "Add interval"
                : "Save interval"}
          </Button>
          {draft.revision !== null && (
            <Button variant="ghost" disabled={disabled} onClick={reset}>
              Cancel edit
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
export function TutorWorkspace() {
  const { account, access } = useAccount();
  if (!account || !access) return null;
  return (
    <TutorContent
      key={account.id}
      access={access}
      name={account.profile.display_name}
      email={account.email}
    />
  );
}
export function TutorContent({
  access,
  name,
  email,
}: {
  access: RealAccess;
  name: string;
  email: string;
}) {
  const ws = useTutorWorkspace(access);
  const { pathname, hash } = useLocation();
  const data = ws.data;
  const hasData = !!data;
  useEffect(() => {
    if (hasData && ["#requests", "#schedule", "#growth"].includes(hash)) {
      const section = document.getElementById(hash.slice(1));
      section?.scrollIntoView({ block: "start" });
      section?.focus({ preventScroll: true });
    }
  }, [pathname, hash, hasData]);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ws.error) feedbackRef.current?.focus();
  }, [ws.error]);
  const disabled = ws.loading || !!ws.pending || !!ws.error;
  const settings = pathname === "/settings";
  const feedback = pathname === "/studio/feedback";
  return (
    <div className="role-dashboard account-workspace tutor-workspace">
      <header className="role-page-heading">
        <Eyebrow>AUTHENTICATED TUTOR · ADULT TEST ACCESS</Eyebrow>
        <h1>
          {settings
            ? "Your teaching profile."
            : feedback
              ? "Your teaching growth."
              : `Welcome, ${name}.`}
        </h1>
        <div className="role-context">
          <span>Server-assigned tutor access</span>
          <span>Asia/Kolkata</span>
        </div>
      </header>
      <p className="account-release-note">
        <LockKeyhole size={16} />
        Real tutoring is closed. This adult test account cannot receive
        bookings.
      </p>
      {ws.error && (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          role="alert"
          className="account-feedback"
        >
          {ws.error}
        </div>
      )}
      {ws.notice && (
        <p role="status" className="account-feedback">
          {ws.notice}
        </p>
      )}
      {ws.loading && <p role="status">Loading your tutor records…</p>}
      <div className="learner-toolbar">
        <Link to="/studio">Tutor overview</Link>
        <Link to="/settings">Edit profile</Link>
        <Button
          variant="ghost"
          disabled={ws.loading || !!ws.pending}
          onClick={() => void ws.reload()}
        >
          Refresh records
        </Button>
      </div>
      {data && (
        <>
          {settings ? (
            <section className="role-section">
              <div className="role-section-title">
                <h2>Account identity & biography</h2>
              </div>
              <dl className="account-details">
                <div>
                  <dt>Display name</dt>
                  <dd>{name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{email}</dd>
                </div>
                <div>
                  <dt>Account ID</dt>
                  <dd>{data.profile.user_id}</dd>
                </div>
                <div>
                  <dt>Academic grade · server-assigned</dt>
                  <dd>Grade {data.profile.academic_grade}</dd>
                </div>
              </dl>
              <Biography
                key={data.profile.revision}
                profile={data.profile}
                disabled={disabled}
                pending={ws.pending === "bio"}
                save={(bio) =>
                  ws.mutate(
                    "bio",
                    () => access.tutor.saveBio(bio, data.profile.revision),
                    "Biography saved to your account.",
                  )
                }
              />
            </section>
          ) : (
            !feedback && (
              <section className="role-next-action">
                <div className="role-next-copy">
                  <Eyebrow>YOUR TEACHING PROFILE</Eyebrow>
                  <h2>A place to prepare for teaching.</h2>
                  <p>
                    {data.profile.bio ||
                      "No teaching biography saved. Add a short introduction to your profile."}
                  </p>
                  <p className="small muted">
                    Grade {data.profile.academic_grade} · server-assigned
                    academic record
                  </p>
                  <ButtonLink to="/settings" variant="outline">
                    Edit teaching profile
                  </ButtonLink>
                </div>
              </section>
            )
          )}
          {!feedback && (
            <section className="role-section">
              <div className="role-section-title">
                <h2>Qualifications & verification</h2>
              </div>
              <dl className="account-details">
                <div>
                  <dt>Verification</dt>
                  <dd>{verificationLabel(data.verification[0]?.status)}</dd>
                </div>
                <div>
                  <dt>Trusted subjects</dt>
                  <dd>
                    {data.subjects.length
                      ? data.subjects.map((q) => {
                          const s = data.catalog.subjects.find(
                            (s) => s.id === q.subject_id,
                          );
                          const g = data.catalog.grades.find(
                            (g) => g.id === s?.gradeId,
                          );
                          return (
                            <p key={q.subject_id}>
                              {s && g
                                ? `${s.name} · Grade ${g.number} · ${data.catalog.boards.find((b) => b.id === g.boardId)?.name}`
                                : `Recorded subject: ${q.subject_id} (catalog label unavailable)`}
                            </p>
                          );
                        })
                      : "No trusted subject qualification recorded"}
                  </dd>
                </div>
                <div>
                  <dt>Trusted languages</dt>
                  <dd>
                    {data.languages.map((l) => l.language).join(", ") ||
                      "No trusted language qualification recorded"}
                  </dd>
                </div>
              </dl>
              <p className="small muted">
                Only trusted services can record qualifications and
                verification. Test approval is not real-world physical
                verification or permission to tutor.
              </p>
              {data.verification.length > 0 && (
                <details>
                  <summary>
                    Verification history · {data.verification.length} records
                  </summary>
                  <ol className="tutor-history">
                    {data.verification.map((v) => (
                      <li key={v.id}>
                        <strong>{verificationLabel(v.status)}</strong>
                        <p>{v.decision_note}</p>
                        <p className="small muted">
                          Event {v.event_number} ·{" "}
                          {new Date(v.created_at).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}{" "}
                          IST
                          {v.verified_grade !== null
                            ? ` · Recorded grade ${v.verified_grade}`
                            : ""}
                        </p>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </section>
          )}
          {!settings && !feedback && (
            <>
              <section className="role-quiet-section">
                <Eyebrow>PROFILE PREPARATION</Eyebrow>
                <h3>
                  {Number(!!data.profile.bio.trim()) +
                    Number(data.availability.length > 0)}{" "}
                  of 2 personal preparation steps saved
                </h3>
                <ul>
                  <li>
                    {data.profile.bio.trim()
                      ? "Biography saved"
                      : "Add your biography in Settings"}
                  </li>
                  <li>
                    {data.availability.length
                      ? `${data.availability.length} weekly intervals saved · ${data.availability.filter((s) => s.enabled).length} enabled preferences`
                      : "Save a weekly availability interval"}
                  </li>
                </ul>
                <p className="small muted">
                  Preparation progress is independent of trusted verification
                  and eligibility.
                </p>
              </section>
              <AvailabilityEditor
                key={data.availability
                  .map((s) => `${s.id}:${s.revision}`)
                  .join(",")}
                saved={data.availability}
                disabled={disabled}
                pending={ws.pending}
                save={(input) =>
                  ws.mutate(
                    input.id,
                    () => access.tutor.saveAvailability(input),
                    "Weekly availability saved. Real bookings remain closed.",
                  )
                }
                remove={(row) =>
                  ws.mutate(
                    row.id,
                    () => access.tutor.deleteAvailability(row.id, row.revision),
                    "Weekly interval removed.",
                  )
                }
              />
              <section className="role-section" id="requests" tabIndex={-1}>
                <div className="role-section-title">
                  <h2>Tutoring requests & sessions</h2>
                </div>
                <EmptyState
                  title="Real tutoring is not open yet."
                  description="No requests or appointments are assigned to this account. Weekly preferences do not create sessions. Verification, consent and matching services must be implemented before participation opens."
                />
              </section>
            </>
          )}
          {!settings && (
            <section className="role-section" id="growth" tabIndex={-1}>
              <div className="role-section-title">
                <h2>Recorded teaching growth</h2>
              </div>
              <dl className="account-details">
                <div>
                  <dt>Teaching skill score</dt>
                  <dd>
                    {data.profile.teaching_skill_score === null
                      ? "No evaluated score recorded"
                      : `${data.profile.teaching_skill_score} / 100 · trusted test record`}
                  </dd>
                </div>
                <div>
                  <dt>Completed sessions</dt>
                  <dd>
                    {data.profile.completed_sessions} recorded by trusted
                    services
                  </dd>
                </div>
              </dl>
              {feedback ? (
                <EmptyState
                  title="No detailed Co-Teacher evaluations recorded."
                  description="No detailed feedback is available for this account. Your recorded score and session count appear above. Sample feedback stays in the fictional demo."
                />
              ) : (
                <Link className="role-text-link" to="/studio/feedback">
                  View Co-Teacher feedback
                </Link>
              )}
            </section>
          )}
        </>
      )}
      <footer className="role-footnote">
        Private adult test workspace · self-declared availability · no real
        child participation
      </footer>
    </div>
  );
}
