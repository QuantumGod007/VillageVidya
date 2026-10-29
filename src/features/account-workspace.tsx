import { lazy, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { BookOpen, LockKeyhole } from "lucide-react";
import { Button, ButtonLink, EmptyState, Eyebrow } from "../components/ui";
import { useWorkspaceIdentity } from "../lib/auth/provider";
import type { CurriculumCatalog } from "../domain/curriculum";
import type { Tables } from "../lib/data-access/database.types";
import { AccountAssistant } from "./account-assistant";
import "./role-dashboards.css";
const LearnerWorkspace = lazy(() =>
  import("./learner-workspace").then((m) => ({ default: m.LearnerWorkspace })),
);

const TutorWorkspace = lazy(() =>
  import("./tutor-workspace").then((m) => ({ default: m.TutorWorkspace })),
);

const TutorDiscovery = lazy(() =>
  import("./tutor-discovery").then((m) => ({ default: m.TutorDiscovery })),
);

const TrustWorkspace = lazy(() =>
  import("./trust-workspace").then((m) => ({ default: m.TrustWorkspace })),
);
const SessionWorkspace = lazy(() =>
  import("./session-workspace").then((m) => ({ default: m.SessionWorkspace })),
);

// Account pages never mount fictional feature components. They use the shared
// authenticated repositories and truthful release states until later phases.
export function AccountWorkspace() {
  const { role } = useWorkspaceIdentity();
  const { pathname } = useLocation();
  if (pathname === "/assistant") return <AccountAssistant />;
  if (pathname === "/sessions" || pathname.startsWith("/room/"))
    return <SessionWorkspace />;
  if (
    ["/champion", "/guardian", "/admin", "/admin/users", "/safety"].includes(
      pathname,
    )
  )
    return <TrustWorkspace />;
  if (pathname === "/tutors") return <TutorDiscovery />;
  if (
    role === "tutor" &&
    ["/studio", "/settings", "/studio/feedback"].includes(pathname)
  )
    return <TutorWorkspace />;
  return role === "learner" &&
    (["/learn", "/explore", "/learn/progress", "/settings"].includes(
      pathname,
    ) ||
      pathname.startsWith("/lesson/")) ? (
    <LearnerWorkspace />
  ) : (
    <OtherAccountWorkspace />
  );
}
function OtherAccountWorkspace() {
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
