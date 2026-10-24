import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { BookOpen, LockKeyhole } from "lucide-react";
import { Button, ButtonLink, EmptyState, Eyebrow } from "../components/ui";
import { useWorkspaceIdentity } from "../lib/auth/provider";
import type { CurriculumCatalog } from "../domain/curriculum";
import type { Tables } from "../lib/data-access/database.types";
import "./role-dashboards.css";

// Account pages never mount fictional feature components. They use the shared
// authenticated repositories and truthful release states until later phases.
export function AccountWorkspace() {
  const { auth, role } = useWorkspaceIdentity();
  const { pathname } = useLocation();
  const { id } = useParams();
  const [catalog, setCatalog] = useState<CurriculumCatalog | null>(null);
  const [progress, setProgress] = useState<Tables<"lesson_progress">[]>([]);
  const [bookmarks, setBookmarks] = useState<Tables<"learner_bookmarks">[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const { account, access } = auth;
  useEffect(() => {
    if (!account || !access) return;
    let active = true;
    setLoading(true);
    setError("");
    setCatalog(null);
    setProgress([]);
    setBookmarks([]);
    Promise.all([
      access.curriculum.load(),
      account.roles.includes("learner") ? access.learner.progress() : [],
      account.roles.includes("learner") ? access.learner.bookmarks() : [],
    ])
      .then(([curriculum, progress, bookmarks]) => {
        if (active) {
          setCatalog(curriculum);
          setProgress(progress);
          setBookmarks(bookmarks);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Your account data could not be loaded. Check your connection and retry.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [account, access, retry]);
  if (!account || !role) return null;
  const section = (sectionId: string, title: string, description: string) => (
    <section className="role-section" id={sectionId} tabIndex={-1}>
      <div className="role-section-title">
        <h2>{title}</h2>
      </div>
      <div className="role-empty-inline">
        <LockKeyhole size={19} />
        <div>
          <h3>Not open for real participation</h3>
          <p>{description}</p>
        </div>
      </div>
    </section>
  );
  const isLibrary = pathname === "/explore" || pathname.startsWith("/lesson/");
  const isSettings = pathname === "/settings";
  const title = isSettings
    ? "Your account."
    : pathname.startsWith("/lesson/")
      ? "Learning resource."
      : isLibrary
        ? "Published curriculum."
        : pathname === "/learn/progress"
          ? "Your learning record."
          : pathname === "/studio/feedback"
            ? "Co-Teacher feedback."
            : pathname === "/admin/users"
              ? "Account access."
              : ["/sessions", "/tutors", "/assistant", "/community"].includes(
                    pathname,
                  ) || pathname.startsWith("/room/")
                ? "A space we’re preparing."
                : `Welcome, ${account.profile.display_name}.`;
  const lesson = catalog?.lessons.find((l) => l.id === id);
  return (
    <div className="role-dashboard account-workspace">
      <header className="role-page-heading">
        <Eyebrow>AUTHENTICATED ADULT TEST ACCOUNT</Eyebrow>
        <h1>{title}</h1>
        <div className="role-context">
          <span>{account.profile.preferred_language}</span>
          <span>Server-assigned {role} access</span>
        </div>
      </header>
      <p className="account-release-note">
        <LockKeyhole size={16} /> Real registration and tutoring are closed.
        This account has no fictional demo history.
      </p>
      {error && (
        <div role="alert" className="account-feedback">
          <p>{error}</p>
          <Button variant="outline" onClick={() => setRetry((n) => n + 1)}>
            Retry account data
          </Button>
        </div>
      )}
      {loading && <p role="status">Loading your account data…</p>}
      {isSettings ? (
        <section className="role-section">
          <div className="role-section-title">
            <h2>Verified account identity</h2>
          </div>
          <dl className="account-details">
            <div>
              <dt>Display name</dt>
              <dd>{account.profile.display_name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{account.email}</dd>
            </div>
            <div>
              <dt>Assigned roles</dt>
              <dd>{account.roles.join(", ")}</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>Provisioned adult test access</dd>
            </div>
          </dl>
          <p className="small muted">
            Role changes, guardian approval and tutor verification require
            trusted administration. Password recovery is available from sign-in
            after signing out.
          </p>
        </section>
      ) : isLibrary ? (
        <>
          {pathname.startsWith("/lesson/") ? (
            !loading &&
            !error &&
            (lesson ? (
              <article className="prose account-resource">
                <Eyebrow>
                  {lesson.subject} · GRADE {lesson.grade} · {lesson.language}
                </Eyebrow>
                <h2>{lesson.title}</h2>
                <p>{lesson.concept}</p>
                <ol>
                  {lesson.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p>{lesson.example}</p>
                <p className="small muted">
                  Original supplementary practice. Persistent checkpoints and
                  assessments are a later phase.
                </p>
                <ButtonLink to="/explore" variant="outline">
                  Back to curriculum
                </ButtonLink>
              </article>
            ) : (
              <EmptyState
                title="Resource unavailable."
                description="This lesson is missing or is not published. No demo resource has been substituted."
              >
                <ButtonLink to="/explore">
                  Browse published resources
                </ButtonLink>
              </EmptyState>
            ))
          ) : (
            <>
              <p className="small muted">
                Read-only published resources from the database. Learner
                enrolment, grade selection and recorded learning will be
                connected in a later phase.
              </p>
              {!loading &&
                !error &&
                (catalog?.lessons.length ? (
                  <div className="role-section">
                    {catalog.lessons.map((l) => (
                      <Link
                        className="role-lesson-row"
                        key={l.id}
                        to={`/lesson/${l.id}`}
                      >
                        <span className="role-subject-mark">
                          <BookOpen size={19} />
                        </span>
                        <div>
                          <Eyebrow>
                            GRADE {l.grade} · {l.subject} · {l.language}
                          </Eyebrow>
                          <h3>{l.title}</h3>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No published resources yet."
                    description="Published curriculum will appear here when available."
                  />
                ))}
            </>
          )}
        </>
      ) : pathname === "/learn/progress" ? (
        <section className="role-section">
          <div className="role-section-title">
            <h2>Recorded progress</h2>
          </div>
          {!loading && !error && (
            <>
              {progress.length ? (
                <ul className="role-activity-list">
                  {progress.map((p) => (
                    <li key={p.lesson_id}>
                      <div>
                        <strong>
                          {catalog?.lessons.find((l) => l.id === p.lesson_id)
                            ?.title ?? p.lesson_id}
                        </strong>
                        <p>{p.checkpoint_percent}% recorded checkpoint</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="role-empty-inline">
                  <BookOpen size={20} />
                  <div>
                    <h3>No recorded learning yet.</h3>
                    <p>
                      Your demo progress stays in the demo. Trusted assessment
                      recording will be connected in a later phase.
                    </p>
                  </div>
                </div>
              )}
              <p className="small muted">
                {bookmarks.length} account bookmarks · no browser demo bookmarks
                imported.
              </p>
            </>
          )}
        </section>
      ) : pathname === "/learn" ? (
        <>
          <section className="role-next-action">
            <div className="role-next-copy">
              <Eyebrow>YOUR NEXT STEP</Eyebrow>
              <h2>Explore the published learning library.</h2>
              <p>
                No grade or subject enrolment has been selected for this
                account. Browse the read-only catalog; personalized learning and
                recorded progress will follow in a dedicated phase.
              </p>
              <ButtonLink to="/explore">Browse curriculum</ButtonLink>
            </div>
          </section>
          {section(
            "sessions",
            "Upcoming sessions",
            "Real matching and sessions remain disabled while child-safety and consent services are completed.",
          )}
        </>
      ) : pathname === "/studio" ? (
        <>
          <section className="role-request-section" id="requests" tabIndex={-1}>
            <div className="role-request-heading">
              <div>
                <Eyebrow>PRIORITY</Eyebrow>
                <h2>Tutoring requests</h2>
              </div>
            </div>
            <div className="role-request-empty">
              <div>
                <h3>Real tutoring is not open yet.</h3>
                <p>
                  No requests or fictional learners are assigned to this
                  account.
                </p>
              </div>
            </div>
          </section>
          <div className="role-overview-columns">
            <div>
              {section(
                "schedule",
                "Next session",
                "Scheduling and real availability activation are not enabled.",
              )}
              {section(
                "activity",
                "Teaching activity",
                "Session history will appear after real tutoring is available.",
              )}
            </div>
            <div>
              <section className="role-quiet-section">
                <Eyebrow>AVAILABILITY</Eyebrow>
                <h3>Participation closed</h3>
                <p>{account.tutor?.bio || "No teaching biography saved."}</p>
              </section>
              <section className="role-quiet-section" id="growth" tabIndex={-1}>
                <Eyebrow>TEACHING GROWTH</Eyebrow>
                <h3>
                  {account.tutor?.teaching_skill_score === null
                    ? "No evaluated score"
                    : `Recorded score: ${account.tutor?.teaching_skill_score ?? "—"}`}
                </h3>
                <p>
                  {account.tutor?.completed_sessions ?? 0} recorded sessions. No
                  sample Co-Teacher results are used.
                </p>
                <Link className="role-text-link" to="/studio/feedback">
                  Co-Teacher feedback
                </Link>
              </section>
            </div>
          </div>
        </>
      ) : pathname === "/guardian" ? (
        <>
          {section(
            "progress",
            "Learner progress",
            "Only independently approved relationships and consent can permit learner access. Real learner participation is closed.",
          )}
          <section className="role-section" id="consent" tabIndex={-1}>
            <div className="role-section-title">
              <h2>Guardian relationships</h2>
            </div>
            {account.relationships.length ? (
              <ul className="role-activity-list">
                {account.relationships.map((r) => (
                  <li key={r.id}>
                    <div>
                      <strong>Relationship status: {r.status}</strong>
                      <p>
                        This relationship status alone does not establish active
                        consent. No client-side approval is available.
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="role-empty-inline">
                <div>
                  <h3>No linked learner.</h3>
                  <p>
                    There is no verified guardian relationship attached to this
                    account. Fictional approvals do not carry over.
                  </p>
                </div>
              </div>
            )}
          </section>
          {section(
            "updates",
            "Updates",
            "No real learner updates are available.",
          )}
        </>
      ) : pathname === "/champion" ? (
        <>
          {section(
            "verification",
            "Tutor verification",
            "Verification requires a future trusted review service. This browser cannot mark a tutor verified.",
          )}
          {section(
            "moderation",
            "Moderation",
            "No real community moderation queue is connected.",
          )}
          {section(
            "reports",
            "Safety reports",
            "Reporting and case handling are not open for real participation.",
          )}
        </>
      ) : pathname === "/admin" ? (
        <>
          <section className="role-next-action">
            <div className="role-next-copy">
              <Eyebrow>PLATFORM</Eyebrow>
              <h2>Review the published catalog.</h2>
              <p>
                Your administrator role does not grant a browser service key or
                bypass row-level security.
              </p>
              <ButtonLink to="/explore">View curriculum</ButtonLink>
            </div>
          </section>
          {section(
            "operations",
            "Operations",
            "Privileged user management and operational changes require future authorized server endpoints.",
          )}
        </>
      ) : pathname === "/admin/users" ? (
        <section className="role-section">
          <h2>Server-controlled user administration</h2>
          <p className="muted">
            User management is not connected. Other accounts are protected by
            RLS; the browser cannot list or promote them. Adult test accounts
            are provisioned only through trusted local tooling.
          </p>
        </section>
      ) : (
        section(
          "unavailable",
          pathname === "/studio/feedback"
            ? "No real Co-Teacher evaluation"
            : "Not available for real accounts yet",
          "Real sessions, matching, AI and community services are not connected in this phase. Explore these simulations through the separately labelled fictional demo.",
        )
      )}
      <footer className="role-footnote">
        Supabase authenticated account · database-enforced access · no demo data
        migration
        {account.roles.length > 1 && (
          <div>
            Assigned workspaces:{" "}
            {account.roles.map((r) => (
              <Link
                key={r}
                className="role-text-link"
                to={
                  {
                    learner: "/learn",
                    tutor: "/studio",
                    guardian: "/guardian",
                    champion: "/champion",
                    admin: "/admin",
                  }[r]
                }
              >
                {r}
              </Link>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}
