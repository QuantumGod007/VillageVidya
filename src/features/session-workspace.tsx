import { useEffect, useMemo, useRef, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Button, ButtonLink, EmptyState, Eyebrow } from "../components/ui";
import { useAccount } from "../lib/auth/provider";
import { useBookings } from "../lib/data-access/use-bookings";
import type {
  ActorBookingRepository,
  TestRequest,
  TestSession,
} from "../lib/data-access/booking-repository";
import type { Language } from "../domain/types";
import { bookingTime, istSchedule } from "../domain/test-booking";
import "./trust-workspace.css";
function useIntent() {
  const current = useRef({ payload: "", id: "" });
  return (payload: unknown) => {
    const value = JSON.stringify(payload);
    if (value !== current.current.payload)
      current.current = { payload: value, id: crypto.randomUUID() };
    return current.current.id;
  };
}
type Mutate = (
  key: string,
  op: () => Promise<string>,
) => Promise<string | null>;
const label = (status: string) => status[0].toUpperCase() + status.slice(1);
function RequestComposer({
  repository,
  disabled,
  mutate,
}: {
  repository: ActorBookingRepository;
  disabled: boolean;
  mutate: Mutate;
}) {
  const [params] = useSearchParams(),
    navigate = useNavigate();
  const [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [duration, setDuration] = useState(15),
    [topic, setTopic] = useState(""),
    [error, setError] = useState("");
  const intent = useIntent();
  return (
    <form
      className="trust-card trust-decision"
      aria-label="Adult-test request"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          const language = params.get("language");
          if (
            !["English", "हिन्दी", "मराठी", "తెలుగు"].includes(language ?? "")
          )
            throw new Error(
              "Return to discovery and select a published subject and language.",
            );
          const input = {
            previewId: params.get("candidate")!,
            subjectId: params.get("subject")!,
            language: language as Language,
            startsAt: istSchedule(date, time),
            durationMinutes: duration,
            topic,
          };
          const id = await mutate("create", () =>
            repository.request({ ...input, intentId: intent(input) }),
          );
          if (id) navigate(`/sessions?record=${id}`, { replace: true });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Check the schedule.");
        }
      }}
    >
      <h2>Request an adult-test session</h2>
      <p>
        Test tutor {params.get("candidate")?.slice(0, 8)} ·{" "}
        {params.get("subject")} · {params.get("language")}
      </p>
      <p className="small muted">
        Choose 2 minutes to 30 days ahead, within this tutor’s saved weekly
        preferences. The database rechecks eligibility and reservations. This
        sends a real test invitation, with no claim that the tutor is online.
      </p>
      <div className="trust-decision-fields">
        <label className="field">
          Session date (IST)
          <input
            type="date"
            required
            value={date}
            disabled={disabled}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="field">
          Session start time (IST)
          <input
            type="time"
            step="60"
            required
            value={time}
            disabled={disabled}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        <label className="field">
          Duration
          <select
            value={duration}
            disabled={disabled}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {[15, 30, 45, 60].map((n) => (
              <option key={n} value={n}>
                {n} minutes
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        Learning topic (optional)
        <input
          maxLength={120}
          value={topic}
          disabled={disabled}
          onChange={(e) => setTopic(e.target.value)}
        />
      </label>
      <p className="small muted">
        Use a short learning topic without personal or contact information. A
        45-second invitation expires on server time; manual fallback shares the
        original 90-second search window.
      </p>
      {error && <p role="alert">{error}</p>}
      <Button type="submit" disabled={disabled}>
        Send test request
      </Button>
      <ButtonLink to="/tutors" variant="ghost">
        Return to discovery
      </ButtonLink>
    </form>
  );
}
function RequestCard({
  row,
  asOf,
  repository,
  disabled,
  mutate,
}: {
  row: TestRequest;
  asOf: string;
  repository: ActorBookingRepository;
  disabled: boolean;
  mutate: Mutate;
}) {
  const intent = useIntent();
  const navigate = useNavigate();
  function respond(action: "accept" | "decline" | "cancel") {
    const input = { requestId: row.id, revision: row.revision, action };
    void mutate(row.id, () =>
      repository.respond({ ...input, intentId: intent(input) }),
    );
  }
  return (
    <article className="trust-card" aria-label={`Request ${row.id}`}>
      <div className="trust-card-title">
        <h3>
          {row.viewer_role === "learner" ? row.tutor_label : row.learner_label}
        </h3>
        <span className="trust-status">{label(row.status)}</span>
      </div>
      <p>
        {row.subject} · {row.language} · {bookingTime(row.starts_at)}–
        {bookingTime(row.ends_at)} IST
      </p>
      {row.topic && <p>{row.topic}</p>}
      <p className="small muted">
        Request {row.id} · Revision {row.revision}
      </p>
      {row.status === "pending" && (
        <p role="status">
          Response window: about{" "}
          {Math.max(
            0,
            Math.ceil((Date.parse(row.expires_at) - Date.parse(asOf)) / 1000),
          )}{" "}
          seconds at last server check. Reply by{" "}
          {bookingTime(row.expires_at, true)} IST. Acceptance is checked against
          database time.
        </p>
      )}
      <div className="trust-confirm-actions">
        {row.status === "pending" &&
          (row.viewer_role === "tutor" ? (
            <>
              <Button disabled={disabled} onClick={() => respond("accept")}>
                Accept test request
              </Button>
              <Button
                variant="outline"
                disabled={disabled}
                onClick={() => respond("decline")}
              >
                Decline test request
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => respond("cancel")}
            >
              Cancel test request
            </Button>
          ))}
        {row.session_id && (
          <ButtonLink to={`/room/${row.session_id}`} variant="outline">
            View confirmed session
          </ButtonLink>
        )}
        {row.can_fallback && (
          <Button
            variant="outline"
            disabled={disabled}
            onClick={async () => {
              const input = { previousRequestId: row.id };
              const next = await mutate(row.id, () =>
                repository.request({ ...input, intentId: intent(input) }),
              );
              if (next) navigate(`/sessions?record=${next}`);
            }}
          >
            Try next eligible tutor
          </Button>
        )}
      </div>
      {row.can_fallback && (
        <p className="small muted">
          Manual fallback rechecks current eligibility and availability,
          excludes previously invited tutors and ends at{" "}
          {bookingTime(row.search_expires_at)} IST. No notification or automatic
          cascade is provided.
        </p>
      )}
    </article>
  );
}
function SessionCard({
  row,
  asOf,
  repository,
  disabled,
  mutate,
}: {
  row: TestSession;
  asOf: string;
  repository: ActorBookingRepository;
  disabled: boolean;
  mutate: Mutate;
}) {
  const [note, setNote] = useState("");
  const intent = useIntent();
  function act(action: "start" | "complete" | "cancel") {
    const input = { sessionId: row.id, revision: row.revision, action, note };
    void mutate(row.id, () =>
      repository.transition({ ...input, intentId: intent(input) }),
    );
  }
  return (
    <article className="trust-card" aria-label={`Session ${row.id}`}>
      <div className="trust-card-title">
        <h3>
          {row.subject} ·{" "}
          {row.viewer_role === "learner" ? row.tutor_label : row.learner_label}
        </h3>
        <span className="trust-status">{label(row.status)}</span>
      </div>
      <p>
        {row.language} · {bookingTime(row.starts_at)}–{bookingTime(row.ends_at)}{" "}
        IST
      </p>
      <p className="small muted">
        Session {row.id} · Revision {row.revision}
      </p>
      <ButtonLink to={`/room/${row.id}`} variant="ghost">
        Session details
      </ButtonLink>
      {row.status === "active" && (
        <label className="field">
          Text session summary (optional)
          <textarea
            rows={3}
            maxLength={400}
            value={note}
            disabled={disabled}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      )}
      <div className="trust-confirm-actions">
        {row.status === "scheduled" && (
          <Button
            disabled={disabled || Date.parse(asOf) < Date.parse(row.starts_at)}
            onClick={() => act("start")}
          >
            Start session record
          </Button>
        )}
        {row.status === "active" && (
          <Button disabled={disabled} onClick={() => act("complete")}>
            Complete session record
          </Button>
        )}
        {["scheduled", "active"].includes(row.status) && (
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => act("cancel")}
          >
            Cancel scheduled session
          </Button>
        )}
      </div>
      {row.status === "scheduled" && (
        <p className="small muted">
          Start is available during the reserved interval. An unstarted session
          becomes missed at its end; an unfinished active record becomes missed
          15 minutes after its end.
        </p>
      )}
      {row.summary && <p>{row.summary}</p>}
      <details>
        <summary>Recorded session activity</summary>
        <ol>
          {row.history.map((e) => (
            <li key={e.event_number}>
              {label(e.status)} · {e.actor_role} · {bookingTime(e.created_at)}{" "}
              IST{e.note && <p>{e.note}</p>}
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}
export function SessionWorkspace({ embedded = false }: { embedded?: boolean }) {
  const { account, access } = useAccount();
  if (!account || !access) return null;
  return (
    <BookingContent
      key={account.id}
      actorId={account.id}
      embedded={embedded}
      source={access.bookings}
    />
  );
}
function BookingContent({
  actorId,
  embedded,
  source,
}: {
  actorId: string;
  embedded: boolean;
  source: import("../lib/data-access/booking-repository").BookingRepository;
}) {
  const { pathname, hash, search } = useLocation(),
    { id } = useParams(),
    [params] = useSearchParams(),
    navigate = useNavigate();
  const [lookup, setLookup] = useState("");
  const repository = useMemo(() => source.forActor(actorId), [source, actorId]);
  const recordId = !embedded ? (id ?? params.get("record")) : null;
  const ws = useBookings(repository, recordId, pathname + hash + search);
  const errorRef = useRef<HTMLDivElement>(null),
    hasData = !!ws.data;
  useEffect(() => {
    if (ws.error) errorRef.current?.focus();
  }, [ws.error]);
  useEffect(() => {
    if (hasData && hash) {
      const target = document.getElementById(hash.slice(1));
      target?.scrollIntoView({ block: "start" });
      target?.focus({ preventScroll: true });
    }
  }, [hasData, hash]);
  const disabled = ws.loading || !!ws.pending || !!ws.error;
  return (
    <div
      className={`account-workspace trust-workspace ${embedded ? "" : "role-dashboard"}`}
    >
      {!embedded && (
        <header className="role-page-heading">
          <Eyebrow>PROVISIONED ADULT TEST ACCOUNTS</Eyebrow>
          <h1>
            {id ? "Your session record." : "Requests & scheduled sessions."}
          </h1>
        </header>
      )}
      <p className="account-release-note">
        Persistent adult-test requests and activity records only. No live chat,
        audio/video, AI replies or production tutoring. Synthetic approval is
        not physical verification.
      </p>
      <div className="trust-toolbar">
        <Button
          variant="ghost"
          disabled={ws.loading || !!ws.pending}
          onClick={() => void ws.reload()}
        >
          Refresh requests and sessions
        </Button>
        <ButtonLink to="/sessions" variant="ghost">
          All requests & sessions
        </ButtonLink>
        <ButtonLink to="/tutors" variant="ghost">
          Find an eligible test tutor
        </ButtonLink>
      </div>
      {!embedded && (
        <form
          className="trust-search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(`/sessions?record=${encodeURIComponent(lookup.trim())}`);
          }}
        >
          <label className="field">
            Find a request or session by ID
            <input
              value={lookup}
              maxLength={36}
              required
              onChange={(e) => setLookup(e.target.value)}
            />
          </label>
          <Button type="submit" variant="outline" disabled={!!ws.pending}>
            Find record
          </Button>
        </form>
      )}
      {ws.loading && (
        <p role="status">Checking current requests and sessions…</p>
      )}
      {ws.error && (
        <div
          role="alert"
          ref={errorRef}
          tabIndex={-1}
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
      {!embedded && params.has("candidate") && (
        <RequestComposer
          repository={repository}
          disabled={disabled}
          mutate={ws.mutate}
        />
      )}
      {ws.data && (
        <>
          <p className="small muted">
            Server check: {bookingTime(ws.data.as_of)} IST. Visible pending
            invitations refresh every 5 seconds; schedules every 15 seconds.
            Hidden screens stop polling. Expiry/missed states are derived on
            reads and actions from database time; no background expiry worker is
            claimed.
          </p>
          {ws.data.more && (
            <p className="account-feedback">
              Showing the newest 50 records in each list. Open a known record ID
              to inspect an older request or session.
            </p>
          )}
          <section className="role-section" id="requests" tabIndex={-1}>
            <div className="role-section-title">
              <h2>
                Test requests ·{" "}
                {ws.data.requests.filter((r) => r.status === "pending").length}{" "}
                pending
              </h2>
            </div>
            {ws.data.requests.length ? (
              <div className="trust-card-list">
                {ws.data.requests.map((r) => (
                  <RequestCard
                    key={`${r.id}:${r.revision}`}
                    row={r}
                    asOf={ws.data!.as_of}
                    repository={repository}
                    disabled={disabled}
                    mutate={ws.mutate}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No test requests yet."
                description="Incoming tutor invitations and your own learner requests appear only when recorded by the server."
              />
            )}
          </section>
          <section className="role-section" id="schedule" tabIndex={-1}>
            <div className="role-section-title">
              <h2>Confirmed schedule & history</h2>
            </div>
            {ws.data.sessions.length ? (
              <div className="trust-card-list">
                {ws.data.sessions.map((s) => (
                  <SessionCard
                    key={`${s.id}:${s.revision}`}
                    row={s}
                    asOf={ws.data!.as_of}
                    repository={repository}
                    disabled={disabled}
                    mutate={ws.mutate}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No scheduled test sessions."
                description="A tutor's valid acceptance reserves an interval atomically. No fictional appointments are imported."
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
