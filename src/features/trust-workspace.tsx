import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ClipboardCheck, Flag, LockKeyhole } from "lucide-react";
import {
  Button,
  ButtonLink,
  EmptyState,
  Eyebrow,
  Modal,
} from "../components/ui";
import { useAccount, type RealAccess } from "../lib/auth/provider";
import { useTrustWorkspace } from "../lib/data-access/use-trust-workspace";
import type {
  HistoryKind,
  LinkedLearner,
  ReviewDecision,
  SafetyReport,
  SafetyStatus,
  TestRelationship,
  TrustHistory,
  TrustRepository,
  TrustSnapshot,
  TutorReview,
} from "../lib/data-access/trust-repository";
import type { Role } from "../domain/types";
import "./role-dashboards.css";
import "./trust-workspace.css";
const statusLabel = (s: string) =>
  (
    ({
      not_started: "Not started",
      not_recorded: "Not recorded",
      pending: "Pending",
      approved: "Approved test record",
      rejected: "Rejected test record",
      revoked: "Revoked",
      submitted: "Submitted",
      under_review: "Under review",
      resolved: "Resolved",
      closed: "Closed",
    }) as Record<string, string>
  )[s] ?? s;
const time = (s: string) =>
  new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
function useIntentId() {
  const ref = useRef({ key: "", id: "" });
  return (payload: unknown) => {
    const key = JSON.stringify(payload);
    if (key !== ref.current.key) ref.current = { key, id: crypto.randomUUID() };
    return ref.current.id;
  };
}
interface Intent {
  key: string;
  title: string;
  description: string;
  operation: () => Promise<unknown>;
}
type Confirm = (intent: Intent) => void;
function Reason({
  value,
  set,
  label = "Decision reason",
}: {
  value: string;
  set: (s: string) => void;
  label?: string;
}) {
  return (
    <label className="field">
      {label}
      <textarea
        value={value}
        onChange={(e) => set(e.target.value)}
        minLength={10}
        maxLength={400}
        rows={3}
        required
        placeholder="Explain this adult-test decision in 10–400 characters."
      />
    </label>
  );
}
function History({
  repository,
  kind,
  id,
}: {
  repository: TrustRepository;
  kind: HistoryKind;
  id: string;
}) {
  const [open, setOpen] = useState(false),
    [data, setData] = useState<TrustHistory | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0);
  useEffect(
    () => () => {
      ++generation.current;
    },
    [],
  );
  async function load(before: number | null = null) {
    const req = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const page = await repository.history(kind, id, before);
      if (req === generation.current)
        setData((old) =>
          before && old
            ? { ...page, records: [...old.records, ...page.records] }
            : page,
        );
    } catch {
      if (req === generation.current) {
        setData(null);
        setError("History access could not be verified. Retry when connected.");
      }
    } finally {
      if (req === generation.current) setLoading(false);
    }
  }
  return (
    <div className="trust-history">
      <Button
        variant="ghost"
        onClick={() => {
          setOpen(!open);
          if (!open) void load();
        }}
        aria-expanded={open}
      >
        {open ? "Hide decision history" : "View decision history"}
      </Button>
      {open && (
        <div>
          {loading && <p role="status">Loading immutable history…</p>}
          {error && (
            <div role="alert">
              <p>{error}</p>
              <Button variant="outline" onClick={() => void load()}>
                Retry history
              </Button>
            </div>
          )}
          {data && (
            <>
              <ol>
                {data.records.map((e) => (
                  <li key={e.event_number}>
                    <strong>{statusLabel(e.status)}</strong>
                    <p>{e.note}</p>
                    <p className="small muted">
                      Event {e.event_number} · {time(e.created_at)} IST · Actor{" "}
                      {e.actor_id.slice(0, 8)}
                      {e.verified_grade !== null
                        ? ` · Grade ${e.verified_grade}`
                        : ""}
                      {e.policy_version ? ` · ${e.policy_version}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
              {!data.records.length && (
                <p className="small muted">No decision events recorded.</p>
              )}
              {data.more && (
                <Button
                  variant="outline"
                  disabled={loading}
                  onClick={() => void load(data.next_before)}
                >
                  Earlier decisions
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
function TutorReviewCard({
  row,
  repository,
  disabled,
  confirm,
  catalog,
}: {
  row: TutorReview;
  repository: TrustRepository;
  disabled: boolean;
  confirm: Confirm;
  catalog: TrustSnapshot & {
    catalog: import("../domain/curriculum").CurriculumCatalog;
  };
}) {
  const [reason, setReason] = useState(""),
    [decision, setDecision] = useState<ReviewDecision>(
      row.status === "approved" ? "revoked" : "approved",
    ),
    [grade, setGrade] = useState(row.academic_grade);
  const intent = useIntentId();
  return (
    <article className="trust-card">
      <div className="trust-card-title">
        <div>
          <Eyebrow>ADULT TUTOR TEST REVIEW</Eyebrow>
          <h3>{row.label}</h3>
          <p className="small muted">Account {row.tutor_id}</p>
        </div>
        <span className="trust-status">{statusLabel(row.status)}</span>
      </div>
      <dl className="trust-facts">
        <div>
          <dt>Assigned academic record</dt>
          <dd>Grade {row.academic_grade}</dd>
        </div>
        <div>
          <dt>Trusted subjects</dt>
          <dd>
            {row.subjects
              .map((id) => {
                const s = catalog.catalog.subjects.find((s) => s.id === id);
                const g = catalog.catalog.grades.find(
                  (g) => g.id === s?.gradeId,
                );
                return s && g
                  ? `${g.boardId} · Grade ${g.number} · ${s.name}`
                  : id;
              })
              .join("; ") || "None recorded"}
          </dd>
        </div>
        <div>
          <dt>Trusted languages</dt>
          <dd>{row.languages.join(", ") || "None recorded"}</dd>
        </div>
        <div>
          <dt>Stored teaching score</dt>
          <dd>
            {row.teaching_skill_score ?? "No evaluated score"} · reviewed
            separately for matching
          </dd>
        </div>
      </dl>
      {row.evidence ? (
        <div className="trust-synthetic">
          <strong>Synthetic classroom metadata</strong>
          <p>{row.evidence.note}</p>
          <p className="small muted">
            Prepared {time(row.evidence.created_at)} IST · Operator{" "}
            {row.evidence.prepared_by.slice(0, 8)}. This is not physical
            verification evidence.
          </p>
        </div>
      ) : (
        <p className="account-feedback">
          No labelled synthetic metadata prepared. A test approval is
          unavailable.
        </p>
      )}
      {row.approval_missing.length > 0 && (
        <ul className="trust-missing">
          {row.approval_missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      {!row.target_active && (
        <p className="account-feedback">
          This test account is inactive. Only revocation of an existing approval
          is permitted.
        </p>
      )}
      {row.last_reason && (
        <p className="small muted">
          Latest decision: {row.last_reason} ·{" "}
          {row.reviewed_at ? time(row.reviewed_at) : ""} IST
        </p>
      )}
      <form
        className="trust-decision"
        onSubmit={(e) => {
          e.preventDefault();
          const payload = {
            tutorId: row.tutor_id,
            token: row.token,
            status: decision,
            grade: decision === "approved" ? grade : null,
            reason,
          };
          confirm({
            key: row.tutor_id,
            title: `Record ${decision} test verification?`,
            description:
              "This records a synthetic adult-test decision only. It does not verify a real identity, physical qualification or child-safety clearance.",
            operation: () =>
              repository.reviewTutor({
                ...payload,
                requestId: intent(payload),
              }),
          });
        }}
      >
        <div className="trust-decision-fields">
          <label className="field">
            Test decision
            <select
              value={decision}
              disabled={disabled}
              onChange={(e) => setDecision(e.target.value as ReviewDecision)}
            >
              {row.status === "approved" ? (
                <option value="revoked">Revoke test approval</option>
              ) : (
                <>
                  <option value="approved">Approve test record</option>
                  {row.status !== "rejected" && (
                    <option value="rejected">Reject test record</option>
                  )}
                </>
              )}
            </select>
          </label>
          {decision === "approved" && (
            <label className="field">
              Approved test grade
              <input
                type="number"
                min={4}
                max={row.academic_grade}
                required
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                disabled={disabled}
              />
            </label>
          )}
        </div>
        <Reason value={reason} set={setReason} />
        <Button
          type="submit"
          disabled={
            disabled ||
            reason.trim().length < 10 ||
            (decision !== "revoked" && !row.target_active) ||
            (decision === "approved" && row.approval_missing.length > 0)
          }
        >
          Review test decision
        </Button>
      </form>
      <History repository={repository} kind="tutor" id={row.tutor_id} />
    </article>
  );
}
function ConsentCard({
  row,
  repository,
  guardian,
  administrator,
  disabled,
  confirm,
  hideLearner,
}: {
  row: TestRelationship;
  repository: TrustRepository;
  guardian: boolean;
  administrator: boolean;
  disabled: boolean;
  confirm: Confirm;
  hideLearner: boolean;
}) {
  const [reason, setReason] = useState("");
  const intent = useIntentId();
  const grant = row.consent_status !== "approved";
  return (
    <article className="trust-card">
      <div className="trust-card-title">
        <div>
          <h3>Adult-test relationship</h3>
          <p className="small muted">Link {row.id}</p>
        </div>
        <span className="trust-status">{statusLabel(row.status)}</span>
      </div>
      <p className="small muted">
        Guardian {row.guardian_id.slice(0, 8)} · Adult learner{" "}
        {row.learner_id.slice(0, 8)}
      </p>
      <p>
        <strong>Consent: {statusLabel(row.consent_status)}</strong>
        {row.recorded_at ? ` · ${time(row.recorded_at)} IST` : ""}
      </p>
      <p className="small muted">
        Test consent records are not legally effective guardian consent. An
        approved relationship alone does not permit learning-record access.
      </p>
      {guardian && row.status === "approved" && (
        <form
          className="trust-decision"
          onSubmit={(e) => {
            e.preventDefault();
            const payload = {
              relationshipId: row.id,
              expectedEvent: row.consent_event,
              grant,
              reason,
            };
            confirm({
              key: row.id,
              title: grant
                ? "Grant adult-test consent?"
                : "Withdraw adult-test consent?",
              description: grant
                ? "Allow access to this linked adult tester’s permitted learning records under adult-test-v1. This is not legal guardian consent."
                : "Record withdrawal. New private learner reads will be denied immediately after the event commits.",
              operation: () =>
                repository.consent({ ...payload, requestId: intent(payload) }),
            });
          }}
        >
          <Reason value={reason} set={setReason} label="Test consent reason" />
          <Button
            type="submit"
            disabled={disabled || reason.trim().length < 10}
          >
            {grant ? "Grant test consent" : "Withdraw test consent"}
          </Button>
        </form>
      )}
      {administrator && row.status !== "revoked" && (
        <form
          className="trust-decision"
          onSubmit={(e) => {
            e.preventDefault();
            const payload = {
              guardianId: row.guardian_id,
              learnerId: row.learner_id,
              revision: row.revision,
              status: "revoked" as const,
              reason,
            };
            confirm({
              key: row.id,
              title: "Revoke this adult-test link?",
              description:
                "The relationship will be revoked and an immutable consent revocation recorded. Re-establishing the link requires fresh guardian test consent.",
              operation: () =>
                repository.relationship({
                  ...payload,
                  requestId: intent(payload),
                }),
            });
          }}
        >
          <Reason
            value={reason}
            set={setReason}
            label="Link revocation reason"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={disabled || reason.trim().length < 10}
          >
            Revoke test link
          </Button>
        </form>
      )}
      {guardian && row.can_share && !hideLearner ? (
        <LinkedLearnerView repository={repository} id={row.id} />
      ) : (
        guardian && (
          <p className="small muted">
            {hideLearner
              ? "Rechecking current learner access…"
              : "Learner records are unavailable without current approved test consent and active test access."}
          </p>
        )
      )}
      <History repository={repository} kind="consent" id={row.id} />
    </article>
  );
}
function LinkedLearnerView({
  repository,
  id,
}: {
  repository: TrustRepository;
  id: string;
}) {
  const [data, setData] = useState<LinkedLearner | null>(null),
    [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    repository
      .learner(id)
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) {
          setData(null);
          setError(
            "Current test consent could not be verified. Learner records are hidden.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [repository, id, attempt]);
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <Button
          variant="ghost"
          onClick={() => {
            setError("");
            setAttempt((n) => n + 1);
          }}
        >
          Retry learner access
        </Button>
      </div>
    );
  if (!data)
    return <p role="status">Checking current consent and learner records…</p>;
  return (
    <section className="trust-learner">
      <Eyebrow>CONSENT-AUTHORISED ADULT TEST RECORDS</Eyebrow>
      <h4>{data.display_name}</h4>
      <p className="small muted">
        {data.language} · Checked {time(data.as_of)} IST
      </p>
      {data.enrollments.length ? (
        <ul>
          {data.enrollments.map((e, i) => (
            <li key={i}>
              {e.subject_id} · {e.language}
              {e.is_active ? " · active context" : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p>No academic context saved.</p>
      )}
      {data.progress.length ? (
        <ul>
          {data.progress.map((p) => (
            <li key={p.lesson_id}>
              {p.lesson_id}: {p.checkpoint_percent}% trusted checkpoint
            </li>
          ))}
        </ul>
      ) : (
        <p>No trusted checkpoint progress recorded.</p>
      )}
    </section>
  );
}
function RelationshipForm({
  repository,
  accounts,
  links,
  disabled,
  confirm,
}: {
  repository: TrustRepository;
  accounts: TrustSnapshot["accounts"];
  links: TestRelationship[];
  disabled: boolean;
  confirm: Confirm;
}) {
  const [guardianId, setGuardian] = useState(""),
    [learnerId, setLearner] = useState(""),
    [reason, setReason] = useState("");
  const intent = useIntentId();
  const existing = links.find(
    (r) => r.guardian_id === guardianId && r.learner_id === learnerId,
  );
  return (
    <form
      className="trust-card trust-decision"
      onSubmit={(e) => {
        e.preventDefault();
        const payload = {
          guardianId,
          learnerId,
          revision: existing?.revision ?? 0,
          status: "approved" as const,
          reason,
        };
        confirm({
          key: "link",
          title: "Establish this adult-test relationship?",
          description:
            "This is an administrative test link between provisioned adults. It grants no learner access until the guardian explicitly grants test consent.",
          operation: () =>
            repository.relationship({ ...payload, requestId: intent(payload) }),
        });
      }}
    >
      <h3>Establish an adult-test relationship</h3>
      <div className="trust-decision-fields">
        <label className="field">
          Guardian test account ID
          <input
            list="test-guardian-accounts"
            value={guardianId}
            onChange={(e) => setGuardian(e.target.value)}
            required
            placeholder="Provisioned guardian UUID"
          />
          <datalist id="test-guardian-accounts">
            {accounts
              .filter((a) => a.available && a.roles.includes("guardian"))
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
          </datalist>
        </label>
        <label className="field">
          Learner test account ID
          <input
            list="test-learner-accounts"
            value={learnerId}
            onChange={(e) => setLearner(e.target.value)}
            required
            placeholder="Provisioned adult learner UUID"
          />
          <datalist id="test-learner-accounts">
            {accounts
              .filter((a) => a.available && a.roles.includes("learner"))
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
          </datalist>
        </label>
      </div>
      <Reason
        value={reason}
        set={setReason}
        label="Relationship decision reason"
      />
      <p className="small muted">
        Use the local classroom manifest or the authorised account list below.
        Both accounts must be active adult testers. Re-established links require
        fresh consent.
      </p>
      <Button
        type="submit"
        disabled={
          disabled ||
          !guardianId ||
          !learnerId ||
          reason.trim().length < 10 ||
          existing?.status === "approved"
        }
      >
        Establish test link
      </Button>
    </form>
  );
}
function SafetyReviewCard({
  row,
  repository,
  disabled,
  confirm,
}: {
  row: SafetyReport;
  repository: TrustRepository;
  disabled: boolean;
  confirm: Confirm;
}) {
  const [note, setNote] = useState(""),
    [status, setStatus] = useState<SafetyStatus>(
      row.status === "submitted" ? "under_review" : "resolved",
    );
  const intent = useIntentId();
  const terminal = row.status === "resolved" || row.status === "closed";
  return (
    <article className="trust-card">
      <div className="trust-card-title">
        <div>
          <Eyebrow>{row.category.toUpperCase()} · ADULT TEST REPORT</Eyebrow>
          <h3>Report {row.id.slice(0, 8)}</h3>
        </div>
        <span className="trust-status">{statusLabel(row.status)}</span>
      </div>
      <p>{row.summary}</p>
      <p className="small muted">
        Server ID {row.id} · Submitted {time(row.created_at)} IST · Revision{" "}
        {row.revision}
      </p>
      {!terminal && (
        <form
          className="trust-decision"
          onSubmit={(e) => {
            e.preventDefault();
            const payload = {
              reportId: row.id,
              revision: row.revision,
              status,
              note,
            };
            confirm({
              key: row.id,
              title: `Record safety action: ${statusLabel(status)}?`,
              description:
                "This is an auditable adult-test action. Private review notes are visible to independent authorised reviewers, not to the reporter.",
              operation: () =>
                repository.reviewReport({
                  ...payload,
                  requestId: intent(payload),
                }),
            });
          }}
        >
          <label className="field">
            Next report status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SafetyStatus)}
            >
              {row.status === "submitted" ? (
                <option value="under_review">Under review</option>
              ) : (
                <>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </>
              )}
            </select>
          </label>
          <Reason value={note} set={setNote} label="Private review action" />
          <Button type="submit" disabled={disabled || note.trim().length < 10}>
            Review safety action
          </Button>
        </form>
      )}
      <History repository={repository} kind="safety" id={row.id} />
    </article>
  );
}
function SafetySubmission({
  repository,
  disabled,
  onSubmit,
}: {
  repository: TrustRepository;
  disabled: boolean;
  onSubmit: (key: string, op: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [category, setCategory] = useState<SafetyReport["category"]>("content"),
    [summary, setSummary] = useState(""),
    [ack, setAck] = useState(false);
  const intent = useIntentId();
  return (
    <form
      className="trust-card trust-decision"
      onSubmit={async (e) => {
        e.preventDefault();
        const input = { category, summary };
        if (
          await onSubmit("report", () =>
            repository.submitReport({ ...input, submissionId: intent(input) }),
          )
        ) {
          setSummary("");
          setAck(false);
        }
      }}
    >
      <div className="trust-card-title">
        <h2>Submit a test safety report</h2>
        <Flag size={22} />
      </div>
      <p className="small muted">
        Use a synthetic adult-test scenario. Do not include real names, contact
        details or children's information. This is not an emergency channel or a
        replacement for safeguarding services.
      </p>
      <label className="field">
        Report category
        <select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as SafetyReport["category"])
          }
        >
          {["conduct", "content", "access", "other"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Synthetic report summary
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
          minLength={10}
          maxLength={800}
          rows={4}
        />
      </label>
      <label className="trust-checkbox">
        <input
          type="checkbox"
          checked={ack}
          required
          onChange={(e) => setAck(e.target.checked)}
        />
        This describes a synthetic adult-test scenario.
      </label>
      <Button
        type="submit"
        disabled={disabled || !ack || summary.trim().length < 10}
      >
        Submit test report
      </Button>
    </form>
  );
}
export function TrustWorkspace() {
  const { account, access } = useAccount();
  const { pathname } = useLocation();
  if (!account || !access) return null;
  const role: Role = pathname.startsWith("/admin")
    ? "admin"
    : pathname === "/champion"
      ? "champion"
      : pathname === "/guardian"
        ? "guardian"
        : account.roles[0];
  return (
    <TrustContent
      key={account.id}
      access={access}
      role={role}
      name={account.profile.display_name}
    />
  );
}
export function TrustContent({
  access,
  role,
  name,
}: {
  access: RealAccess;
  role: Role;
  name: string;
}) {
  const { pathname, hash } = useLocation();
  const safetyPage = pathname === "/safety";
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
  const ws = useTrustWorkspace(access, search);
  const [confirmation, setConfirmation] = useState<Intent | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ws.error && !confirmation) errorRef.current?.focus();
  }, [ws.error, confirmation]);
  const hasData = !!ws.data;
  useEffect(() => {
    if (hasData && hash) {
      const section = document.getElementById(hash.slice(1));
      section?.scrollIntoView({ block: "start" });
      section?.focus({ preventScroll: true });
    }
  }, [hash, hasData]);
  const disabled = ws.loading || !!ws.pending || !!ws.error;
  const data = ws.data;
  return (
    <div className="role-dashboard account-workspace trust-workspace">
      <header className="role-page-heading">
        <Eyebrow>AUTHENTICATED ADULT TEST ACCOUNT</Eyebrow>
        <h1>{safetyPage ? "A safer place to learn." : `Welcome, ${name}.`}</h1>
        <p className="muted">
          {safetyPage
            ? "Report a synthetic concern and follow its recorded status."
            : role === "guardian"
              ? "Your adult-test relationships, consent and permitted learner records."
              : role === "admin"
                ? "Explicit test administration, independent reviews and audited actions."
                : "Review labelled test records and handle permitted safety reports."}
        </p>
      </header>
      <p className="account-release-note">
        <LockKeyhole size={16} />
        Adult-test workflows only. No physical tutor verification, legal
        guardian consent, production safeguarding or live tutoring is provided.
      </p>
      <div className="trust-toolbar">
        <Button
          variant="ghost"
          disabled={!!ws.pending || ws.loading}
          onClick={() => void ws.reload()}
        >
          Refresh trust records
        </Button>
        <ButtonLink to="/safety" variant="ghost">
          My test safety reports
        </ButtonLink>
        <span className="small muted">
          Records rechecked every 30 seconds and before each action.
        </span>
      </div>
      {ws.error && (
        <div
          ref={errorRef}
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
      {ws.loading && <p role="status">Loading current trust records…</p>}
      {!safetyPage && (role === "champion" || role === "admin") && (
        <form
          className="trust-search"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(query.trim());
          }}
        >
          <label className="field">
            Narrow review lists by account or record ID
            <input
              value={query}
              maxLength={64}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <Button type="submit" variant="outline" disabled={!!ws.pending}>
            Search review records
          </Button>
        </form>
      )}
      {safetyPage && (
        <SafetySubmission
          repository={access.trust}
          disabled={disabled || !data}
          onSubmit={(key, op) =>
            ws.mutate(
              key,
              op,
              "Test report saved with a server identifier. Its current status is shown below.",
            )
          }
        />
      )}
      {data && (
        <>
          <p className="small muted">
            Last confirmed server view: {time(data.as_of)} IST. Decisions use
            current server checks; a previous view never authorises a new
            action.
          </p>
          {Object.values(data.more).some(Boolean) && (
            <p className="account-feedback">
              One or more lists show the first 50 records. Narrow by an account
              or record ID to find older entries. History pages load 20
              immutable events at a time.
            </p>
          )}
          {!safetyPage && data.administrator && (
            <section className="role-section" id="operations" tabIndex={-1}>
              <div className="role-section-title">
                <h2>Permitted test administration</h2>
                <ClipboardCheck size={21} />
              </div>
              <p className="small muted">
                You may establish/revoke test relationships, independently
                review tutor test records and process test safety reports. Role
                assignment, account access, grades, qualifications and scores
                remain operator-controlled.
              </p>
              <RelationshipForm
                repository={access.trust}
                accounts={data.accounts}
                links={data.relationships}
                disabled={disabled}
                confirm={setConfirmation}
              />
              <details className="trust-account-list">
                <summary>
                  Authorised account summaries · {data.accounts.length} listed
                </summary>
                <ul>
                  {data.accounts.map((a) => (
                    <li key={a.id}>
                      <strong>{a.label}</strong> · {a.roles.join(", ")} ·{" "}
                      {a.available
                        ? "Active adult test access"
                        : "Inactive test access"}
                      <code>{a.id}</code>
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}
          {!safetyPage && (role === "guardian" || data.administrator) && (
            <section className="role-section" id="consent" tabIndex={-1}>
              <div className="role-section-title">
                <h2>Adult-test relationships & consent</h2>
              </div>
              {data.relationships.length ? (
                <div className="trust-card-list">
                  {data.relationships.map((row) => (
                    <ConsentCard
                      key={`${row.id}:${row.revision}:${row.consent_event}`}
                      row={row}
                      repository={access.trust}
                      guardian={role === "guardian"}
                      administrator={data.administrator}
                      disabled={disabled}
                      confirm={setConfirmation}
                      hideLearner={ws.loading || !!ws.pending || !!ws.error}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No linked adult tester."
                  description="An authorised administrator must establish the test relationship. No learner information is disclosed by this empty state."
                />
              )}
            </section>
          )}
          {!safetyPage && role === "guardian" && (
            <section className="role-quiet-section" id="progress" tabIndex={-1}>
              <h2>Current learner access</h2>
              <p>
                Permitted learning records appear within each consent-authorised
                relationship above. Withdrawal, unlinking, bans or disabled test
                access deny new private reads.
              </p>
            </section>
          )}
          {!safetyPage && role === "guardian" && (
            <section className="role-quiet-section" id="updates" tabIndex={-1}>
              <h2>Consent updates</h2>
              {data.relationships.length ? (
                data.relationships.map((r) => (
                  <p key={r.id}>
                    Link {r.id.slice(0, 8)} · {statusLabel(r.consent_status)}
                    {r.recorded_at ? ` · ${time(r.recorded_at)} IST` : ""}
                  </p>
                ))
              ) : (
                <p>No consent decisions are available for this account.</p>
              )}
            </section>
          )}
          {!safetyPage && data.staff && (
            <section className="role-section" id="verification" tabIndex={-1}>
              <div className="role-section-title">
                <h2>Tutor test-review queue</h2>
                <span>{data.tutor_reviews.length} records listed</span>
              </div>
              <p className="small muted">
                Only labelled synthetic classroom metadata is reviewed here. A
                test approval cannot establish real-world identity, physical
                qualifications or child-safety clearance.
              </p>
              {data.tutor_reviews.length ? (
                <div className="trust-card-list">
                  {data.tutor_reviews.map((row) => (
                    <TutorReviewCard
                      key={`${row.tutor_id}:${row.token}`}
                      row={row}
                      repository={access.trust}
                      disabled={disabled}
                      confirm={setConfirmation}
                      catalog={data}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No permitted tutor reviews."
                  description="Provisioned adult tutors awaiting review appear when available. Synthetic metadata is prepared only by trusted local tooling."
                />
              )}
            </section>
          )}
          {!safetyPage && data.staff && (
            <section className="role-section" id="reports" tabIndex={-1}>
              <div className="role-section-title">
                <h2>Independent safety review queue</h2>
              </div>
              <p className="small muted" id="moderation" tabIndex={-1}>
                Submitted → Under review → Resolved or Closed. You cannot review
                your own reports. Actions do not replace production moderation
                or emergency escalation.
              </p>
              {data.safety_queue.length ? (
                <div className="trust-card-list">
                  {data.safety_queue.map((row) => (
                    <SafetyReviewCard
                      key={`${row.id}:${row.revision}`}
                      row={row}
                      repository={access.trust}
                      disabled={disabled}
                      confirm={setConfirmation}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No safety reports awaiting this reviewer."
                  description="Only authorised adult-test reports from other accounts appear here. Your own reports are available separately."
                />
              )}
            </section>
          )}
          {safetyPage && (
            <section className="role-section">
              <div className="role-section-title">
                <h2>My test safety reports</h2>
              </div>
              {data.reports.length ? (
                <div className="trust-card-list">
                  {data.reports.map((r) => (
                    <article className="trust-card" key={r.id}>
                      <div className="trust-card-title">
                        <h3>Report {r.id.slice(0, 8)}</h3>
                        <span className="trust-status">
                          {statusLabel(r.status)}
                        </span>
                      </div>
                      <p>{r.summary}</p>
                      <p className="small muted">
                        Server ID {r.id} · {time(r.created_at)} IST · Updated{" "}
                        {time(r.updated_at)} IST
                      </p>
                      <p className="small muted">
                        Private review actions are restricted to independent
                        authorised reviewers.
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No test reports submitted."
                  description="A submitted report will receive a server identifier, timestamp and status. No sample incidents have been created."
                />
              )}
            </section>
          )}
          {!safetyPage && data.staff && (
            <section className="role-section" id="history" tabIndex={-1}>
              <div className="role-section-title">
                <h2>Audited test actions</h2>
              </div>
              {data.recent_actions.length ? (
                <ol className="trust-audit">
                  {data.recent_actions.map((a) => (
                    <li key={a.id}>
                      <strong>{a.operation.replaceAll("_", " ")}</strong>
                      <p>{a.reason}</p>
                      <p className="small muted">
                        Actor {a.actor_id.slice(0, 8)} · Record{" "}
                        {a.subject_id.slice(0, 8)} · {time(a.created_at)} IST ·
                        Audit {a.id}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">
                  No permitted administrative decisions recorded yet.
                </p>
              )}
            </section>
          )}
        </>
      )}
      <Modal
        open={!!confirmation}
        onClose={() => {
          if (!ws.pending) setConfirmation(null);
        }}
        title={confirmation?.title ?? "Confirm test action"}
      >
        {confirmation && (
          <>
            <p>{confirmation.description}</p>
            <p className="small muted">
              Reviewer identity and timestamps are assigned by the server. The
              action creates an immutable event.
            </p>
            <div className="trust-confirm-actions">
              <Button
                disabled={!!ws.pending || ws.loading || !!ws.error}
                onClick={async () => {
                  await ws.mutate(
                    confirmation.key,
                    confirmation.operation,
                    "Adult-test decision recorded. The latest authoritative records are shown below.",
                  );
                  setConfirmation(null);
                }}
              >
                {ws.pending ? "Recording test action…" : "Confirm test action"}
              </Button>
              <Button
                variant="ghost"
                disabled={!!ws.pending}
                onClick={() => setConfirmation(null)}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </Modal>
      <footer className="role-footnote">
        Provisioned adults · synthetic test records · no production
        participation
      </footer>
    </div>
  );
}
