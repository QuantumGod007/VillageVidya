import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowUpRight, Bookmark, BookOpen, Check } from "lucide-react";
import { Button, ButtonLink, EmptyState, Eyebrow } from "../components/ui";
import { useAccount } from "../lib/auth/provider";
import {
  useLearnerWorkspace,
  type LearnerSnapshot,
} from "../lib/data-access/use-learner-workspace";
import {
  lessonsFor,
  type AcademicContext,
  type CurriculumCatalog,
} from "../domain/curriculum";
import type { Language } from "../domain/types";
import type { Tables } from "../lib/data-access/database.types";
import "./role-dashboards.css";
export function enrollmentContext(
  catalog: CurriculumCatalog,
  enrollment?: Tables<"learner_academic_enrollments">,
): AcademicContext | null {
  const subject = catalog.subjects.find((s) => s.id === enrollment?.subject_id);
  const grade = catalog.grades.find((g) => g.id === subject?.gradeId);
  if (
    !enrollment ||
    !subject ||
    !grade ||
    !catalog.boards.some((b) => b.id === grade.boardId)
  )
    return null;
  return {
    boardId: grade.boardId,
    grade: grade.number,
    subject: subject.name,
    language: enrollment.language,
  };
}
function AcademicSelection({
  data,
  disabled,
  pending,
  onSave,
}: {
  data: LearnerSnapshot;
  disabled: boolean;
  pending: boolean;
  onSave: (subject: string, language: Language) => void;
}) {
  const active = data.enrollments.find((e) => e.is_active);
  const initial = enrollmentContext(data.catalog, active);
  const [board, setBoard] = useState(
    initial?.boardId ?? data.catalog.boards[0]?.id ?? "",
  );
  const [grade, setGrade] = useState(initial ? String(initial.grade) : "");
  const [subject, setSubject] = useState(initial ? active!.subject_id : "");
  const languages = [...new Set(data.catalog.lessons.map((l) => l.language))];
  const [language, setLanguage] = useState<Language | "">(
    initial?.language ?? languages[0] ?? "",
  );
  const grades = data.catalog.grades.filter((g) => g.boardId === board);
  const gradeId = grades.find((g) => String(g.number) === grade)?.id;
  const subjects = data.catalog.subjects.filter((s) => s.gradeId === gradeId);
  const chosen = subjects.find((s) => s.id === subject);
  const count = data.catalog.lessons.filter(
    (l) =>
      l.boardId === board &&
      String(l.grade) === grade &&
      l.subject === chosen?.name &&
      l.language === language,
  ).length;
  return (
    <section className="role-section" aria-labelledby="academic-title">
      <div className="role-section-title">
        <h2 id="academic-title">Academic preferences</h2>
      </div>
      <p className="small muted">
        Choose from the published catalog. This changes your active context and
        keeps all previous reading and saved lessons.
      </p>
      <form
        className="learner-selection"
        onSubmit={(e) => {
          e.preventDefault();
          if (chosen && language) onSave(subject, language);
        }}
      >
        <label className="field">
          Academic board
          <select
            value={board}
            disabled={disabled}
            onChange={(e) => {
              setBoard(e.target.value as typeof board);
              setGrade("");
              setSubject("");
            }}
          >
            {data.catalog.boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Learner grade
          <select
            value={grade}
            disabled={disabled}
            onChange={(e) => {
              setGrade(e.target.value);
              setSubject("");
            }}
            required
          >
            <option value="">Choose a grade</option>
            {grades.map((g) => (
              <option value={g.number} key={g.id}>
                Grade {g.number}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Subject
          <select
            value={subject}
            disabled={disabled || !subjects.length}
            onChange={(e) => setSubject(e.target.value)}
            required
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
          Learning language
          <select
            value={language}
            disabled={disabled || !languages.length}
            onChange={(e) => setLanguage(e.target.value as Language)}
            required
          >
            {!languages.length && (
              <option value="">No published languages</option>
            )}
            {languages.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <p className="small muted learner-selection-note">
          {grade && !subjects.length
            ? "No published subjects for this board and grade yet. Your existing selection stays unchanged."
            : chosen
              ? `${count} published lesson${count === 1 ? "" : "s"} for this selection. ${count ? "Original supplementary practice; limited catalog coverage." : "You can save this published context; lessons have not been added for it yet."}`
              : "Grades 4–10 are supported. The current sample has eight original English lessons; available languages come from published resources."}
        </p>
        <Button
          type="submit"
          disabled={disabled || !chosen || !language}
          aria-busy={pending}
        >
          {pending ? "Saving academic selection…" : "Save academic selection"}
        </Button>
      </form>
    </section>
  );
}
export function LearnerWorkspace() {
  const { account, access } = useAccount();
  if (!account || !access) return null;
  return (
    <LearnerContent
      key={account.id}
      access={access}
      name={account.profile.display_name}
      email={account.email}
    />
  );
}
export function LearnerContent({
  access,
  name,
  email,
}: {
  access: NonNullable<ReturnType<typeof useAccount>["access"]>;
  name: string;
  email: string;
}) {
  const ws = useLearnerWorkspace(access);
  const { pathname } = useLocation();
  const { id } = useParams();
  const [params] = useSearchParams();
  const data = ws.data;
  const active = data?.enrollments.find((e) => e.is_active);
  const context = data ? enrollmentContext(data.catalog, active) : null;
  const library =
    data && context ? lessonsFor(data.catalog.lessons, context) : [];
  const lesson = data?.catalog.lessons.find((l) => l.id === id);
  const started = data?.activity.find((a) => a.lesson_id === id);
  const attempted = useRef("");
  const { mutate, pending } = ws;
  const ready = !!data && !ws.loading && !ws.error;
  const disabled = !ready || !!ws.pending;
  useEffect(() => {
    if (
      ready &&
      lesson &&
      !started &&
      !pending &&
      attempted.current !== lesson.id
    ) {
      attempted.current = lesson.id;
      void mutate(
        `start:${lesson.id}`,
        () => access.learner.recordReading(lesson.id, false),
        "Reading started. No score was awarded.",
      );
    }
  }, [ready, lesson, started, pending, mutate, access]);
  const savedView = pathname === "/explore" && params.get("saved") === "1";
  const isLesson = pathname.startsWith("/lesson/");
  const reading = data?.activity.filter((a) => a.read_at) ?? [];
  const next = library.find((l) => !reading.some((a) => a.lesson_id === l.id));
  const contextLabel = context
    ? `${data?.catalog.boards.find((b) => b.id === context.boardId)?.name} · Grade ${context.grade} · ${context.subject} · ${context.language}`
    : active
      ? "Your previous selection is no longer published. Choose another context."
      : "Choose your academic context to begin.";
  function bookmark(lessonId: string, title: string) {
    const saved = data!.bookmarks.some((b) => b.lesson_id === lessonId);
    return (
      <Button
        variant="ghost"
        disabled={disabled}
        aria-busy={ws.pending === `bookmark:${lessonId}`}
        aria-label={`${saved ? "Unsave" : "Save"} ${title}`}
        onClick={() =>
          void ws.mutate(
            `bookmark:${lessonId}`,
            () => access.learner.setBookmark(lessonId, !saved),
            saved
              ? "Lesson removed from saved lessons."
              : "Lesson saved to your account.",
          )
        }
      >
        <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
        {ws.pending === `bookmark:${lessonId}`
          ? "Saving…"
          : saved
            ? "Saved"
            : "Save"}
      </Button>
    );
  }
  function rows(ids: string[]) {
    return (
      <ul className="learner-resource-list">
        {ids.map((lessonId) => {
          const resource = data!.catalog.lessons.find((l) => l.id === lessonId);
          const activity = data!.activity.find((a) => a.lesson_id === lessonId);
          return (
            <li key={lessonId}>
              <div>
                {resource ? (
                  <>
                    <Eyebrow>
                      {
                        data!.catalog.boards.find(
                          (b) => b.id === resource.boardId,
                        )?.name
                      }{" "}
                      · {resource.subject} · Grade {resource.grade} ·{" "}
                      {resource.language}
                    </Eyebrow>
                    <Link
                      className="learner-resource-title"
                      to={`/lesson/${resource.id}`}
                    >
                      {resource.title}
                      <ArrowUpRight size={15} />
                    </Link>
                    <p className="small muted">
                      {activity?.read_at
                        ? "Read · self-reported"
                        : activity
                          ? "Started reading"
                          : "Not started"}{" "}
                      · {resource.minutes} min · original practice
                    </p>
                  </>
                ) : (
                  <>
                    <strong>Resource unavailable</strong>
                    <p className="small muted">
                      This saved resource is no longer published. Its record is
                      retained; you can remove the bookmark.
                    </p>
                  </>
                )}
              </div>
              {bookmark(lessonId, resource?.title ?? "unavailable resource")}
            </li>
          );
        })}
      </ul>
    );
  }
  const title =
    pathname === "/learn"
      ? `Welcome, ${name}.`
      : isLesson
        ? (lesson?.title ?? "Learning resource.")
        : pathname === "/learn/progress"
          ? "Your learning record."
          : pathname === "/settings"
            ? "Your academic preferences."
            : savedView
              ? "Saved for later."
              : "Your learning library.";
  return (
    <div className="role-dashboard account-workspace learner-workspace">
      <header className="role-page-heading">
        <Eyebrow>AUTHENTICATED LEARNER · ADULT TEST ACCESS</Eyebrow>
        <h1>{title}</h1>
        <div className="role-context">
          <span>{contextLabel}</span>
          {context && <Link to="/settings">Change preferences</Link>}
        </div>
      </header>
      {ws.error && (
        <div className="account-feedback" role="alert">
          {ws.error}
        </div>
      )}
      {ws.notice && (
        <p className="account-feedback" role="status">
          {ws.notice}
        </p>
      )}
      {ws.loading && <p role="status">Loading your learner records…</p>}
      <div className="learner-toolbar">
        <Link to="/explore">My Learning</Link>
        <Link to="/explore?saved=1">
          Saved lessons{data ? ` · ${data.bookmarks.length}` : ""}
        </Link>
        <Button
          variant="ghost"
          disabled={!!ws.pending || ws.loading}
          onClick={() => void ws.reload()}
        >
          Refresh records
        </Button>
      </div>
      {data && (
        <>
          {pathname === "/settings" ? (
            <>
              <p className="small muted">
                {name} · {email} · server-assigned learner account
              </p>
              <AcademicSelection
                key={active?.id ?? "none"}
                data={data}
                disabled={disabled}
                pending={ws.pending === "enroll"}
                onSave={(subject, language) =>
                  void ws.mutate(
                    "enroll",
                    () => access.learner.enroll(subject, language),
                    "Academic selection saved to your account.",
                  )
                }
              />
            </>
          ) : isLesson ? (
            lesson ? (
              <>
                {context && !library.some((l) => l.id === lesson.id) && (
                  <p className="account-release-note">
                    This lesson is outside your active academic context. You
                    opened it explicitly; it is not your next recommended
                    lesson.
                  </p>
                )}
                <div className="learner-lesson-actions">
                  {bookmark(lesson.id, lesson.title)}
                  <Button
                    disabled={disabled || !!started?.read_at}
                    aria-busy={ws.pending === `read:${lesson.id}`}
                    onClick={() =>
                      void ws.mutate(
                        `read:${lesson.id}`,
                        () => access.learner.recordReading(lesson.id, true),
                        "Marked as read. This is self-reported reading, not checkpoint mastery.",
                      )
                    }
                  >
                    <Check size={16} />
                    {started?.read_at
                      ? "Read · self-reported"
                      : ws.pending === `read:${lesson.id}`
                        ? "Recording…"
                        : "Mark as read"}
                  </Button>
                  {!started && (
                    <Button
                      variant="outline"
                      disabled={disabled}
                      onClick={() =>
                        void ws.mutate(
                          `start:${lesson.id}`,
                          () => access.learner.recordReading(lesson.id, false),
                          "Reading started.",
                        )
                      }
                    >
                      Retry reading record
                    </Button>
                  )}
                </div>
                <article className="prose account-resource">
                  <Eyebrow>
                    {lesson.subject} · GRADE {lesson.grade} · {lesson.language}
                  </Eyebrow>
                  <p>{lesson.concept}</p>
                  <ol>
                    {lesson.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                  <p>{lesson.example}</p>
                  <p className="small muted">
                    Original supplementary practice. Opening this lesson records
                    “started”; “Mark as read” is your own reading report.
                    Neither action creates an assessment score.
                  </p>
                  <ButtonLink to="/explore" variant="outline">
                    Back to My Learning
                  </ButtonLink>
                </article>
              </>
            ) : (
              !ws.loading && (
                <EmptyState
                  title="Resource unavailable."
                  description="This lesson is missing or unpublished. No demo resource has been substituted."
                >
                  <ButtonLink to="/explore">Back to My Learning</ButtonLink>
                </EmptyState>
              )
            )
          ) : pathname === "/explore" ? (
            <>
              {savedView ? (
                <>
                  <h2 className="learner-section-heading">
                    Saved lessons across your academic contexts
                  </h2>
                  <p className="small muted">
                    {data.bookmarks.length} saved records from your account. All
                    grades are labelled; unavailable resources retain a bookmark
                    only.
                  </p>
                  {data.bookmarks.length ? (
                    rows(data.bookmarks.map((b) => b.lesson_id))
                  ) : (
                    <EmptyState
                      title="A place for lessons you want to revisit."
                      description="Save a lesson from your library. It will be available here after you sign in on another device."
                    >
                      <ButtonLink to="/explore">Browse My Learning</ButtonLink>
                    </EmptyState>
                  )}
                </>
              ) : context ? (
                <>
                  <p className="small muted">
                    {library.length} published lessons for your active
                    selection. Reading is self-reported; scored mastery is
                    tracked separately.
                  </p>
                  {library.length ? (
                    rows(library.map((l) => l.id))
                  ) : (
                    <EmptyState
                      title="No lessons for this selection yet."
                      description="Your published academic selection is saved. No resources from another grade or language have been substituted."
                    >
                      <ButtonLink to="/settings">
                        Change academic preferences
                      </ButtonLink>
                    </EmptyState>
                  )}
                </>
              ) : (
                <AcademicSelection
                  key={active?.id ?? "none"}
                  data={data}
                  disabled={disabled}
                  pending={ws.pending === "enroll"}
                  onSave={(subject, language) =>
                    void ws.mutate(
                      "enroll",
                      () => access.learner.enroll(subject, language),
                      "Academic selection saved to your account.",
                    )
                  }
                />
              )}
            </>
          ) : pathname === "/learn/progress" ? (
            <>
              <section className="role-section">
                <div className="role-section-title">
                  <h2>Reading activity · self-reported</h2>
                </div>
                <p className="small muted">
                  Across your academic contexts: {data.activity.length} started
                  · {reading.length} marked as read · {data.bookmarks.length}{" "}
                  saved. These are reading records, not verified mastery.
                </p>
                {data.activity.length ? (
                  rows(data.activity.map((a) => a.lesson_id))
                ) : (
                  <EmptyState
                    title="No recorded learning yet."
                    description="Open a published lesson to record a start, then mark it as read when you finish. Your fictional demo activity is never imported."
                  />
                )}
              </section>
              <section className="role-section">
                <div className="role-section-title">
                  <h2>Trusted checkpoint results</h2>
                </div>
                {data.progress.length ? (
                  <ul className="role-activity-list">
                    {data.progress.map((p) => (
                      <li key={p.lesson_id}>
                        <div>
                          <strong>
                            {data.catalog.lessons.find(
                              (l) => l.id === p.lesson_id,
                            )?.title ?? "Resource no longer published"}
                          </strong>
                          <p>
                            {p.checkpoint_percent}% trusted checkpoint result
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="small muted">
                    No trusted checkpoint results yet. Reading does not award
                    scores. {data.attempts.length} recorded assessment attempts;
                    browser assessment submission is not enabled.
                  </p>
                )}
              </section>
            </>
          ) : (
            <>
              <section className="role-next-action">
                <div className="role-next-copy">
                  <Eyebrow>YOUR NEXT STEP</Eyebrow>
                  <h2>
                    {!context
                      ? "Make this learning space yours."
                      : next
                        ? next.title
                        : library.length
                          ? "A little time to revisit."
                          : "Your context is saved."}
                  </h2>
                  <p>
                    {!context
                      ? "Choose your board, grade, subject and available language. Your account will remember them."
                      : next
                        ? "Continue with a published lesson for your academic selection. Your reading and saved lessons stay with your account."
                        : library.length
                          ? "You’ve marked the current lessons as read. Revisit any lesson; this reading report is separate from assessment mastery."
                          : "There are no published lessons for this context yet. Your earlier reading and bookmarks are safe."}
                  </p>
                  <ButtonLink
                    to={
                      !context
                        ? "/settings"
                        : next
                          ? `/lesson/${next.id}`
                          : "/explore"
                    }
                  >
                    {!context
                      ? "Choose academic preferences"
                      : next
                        ? "Continue reading"
                        : "View My Learning"}
                  </ButtonLink>
                </div>
              </section>
              <div className="role-overview-columns">
                <section className="role-section">
                  <div className="role-section-title">
                    <h2>Recent reading</h2>
                    <Link className="role-text-link" to="/learn/progress">
                      View activity
                    </Link>
                  </div>
                  {data.activity.length ? (
                    rows(data.activity.slice(0, 3).map((a) => a.lesson_id))
                  ) : (
                    <div className="role-empty-inline">
                      <BookOpen size={20} />
                      <div>
                        <h3>A fresh page for your account.</h3>
                        <p>
                          Open a lesson to begin. Your demo history stays in the
                          fictional demo.
                        </p>
                      </div>
                    </div>
                  )}
                </section>
                <aside className="role-secondary-column">
                  <section className="role-quiet-section">
                    <Eyebrow>YOUR ACCOUNT RECORDS</Eyebrow>
                    <div className="role-summary-line">
                      <span>Marked as read</span>
                      <strong>{reading.length}</strong>
                    </div>
                    <div className="role-summary-line">
                      <span>Saved lessons</span>
                      <strong>{data.bookmarks.length}</strong>
                    </div>
                    <Link className="role-text-link" to="/explore?saved=1">
                      Open saved lessons
                    </Link>
                    <p className="role-caption">
                      Across all your academic contexts. Reading is
                      self-reported.
                    </p>
                  </section>
                </aside>
              </div>
            </>
          )}
        </>
      )}
      <footer className="role-footnote">
        Account-backed learner records · real registration and tutoring remain
        closed · no fictional progress or assessment scores imported.
      </footer>
    </div>
  );
}
