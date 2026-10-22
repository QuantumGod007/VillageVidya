import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowLeft,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Clock3,
  Search,
  Check,
  Lightbulb,
  Sparkles,
  ArrowRight,
  Trophy,
  CalendarDays,
  Users,
  ChevronRight,
  WifiOff,
} from "lucide-react";
import { lessons, knowledgeCards, tutors } from "../data/demo";
import { useStore, languageLabels } from "../lib/store";
import {
  ArrowLink,
  Avatar,
  Button,
  ButtonLink,
  EmptyState,
  Eyebrow,
  Progress,
} from "../components/ui";
import { Roti } from "../components/learning-art";
import type { Subject } from "../domain/types";
const subjects: Subject[] = [
  "Mathematics",
  "Science",
  "English",
  "Social Science",
];
const colorFor: Record<Subject, string> = {
  Mathematics: "peach",
  Science: "sage",
  English: "butter",
  "Social Science": "blue",
};
export function Dashboard() {
  const { data, completed, requests } = useStore();
  const next =
    lessons.find((l) => (data.progress[l.id] || 0) < 100) ?? lessons[0];
  const fullyComplete = lessons.filter(
    (l) => data.progress[l.id] === 100,
  ).length;
  const upcoming = requests.filter(
    (r) => r.status === "accepted" && r.scheduled,
  );
  const average = Math.round(
    lessons.reduce((sum, l) => sum + (data.progress[l.id] || 0), 0) /
      lessons.length,
  );
  return (
    <div className="dashboard-content">
      <div className="page-heading dashboard-heading">
        <div>
          <Eyebrow>ONE SMALL STEP, EVERY DAY</Eyebrow>
          <h1>
            {languageLabels[data.language].hello}, <em>Aarav.</em>
          </h1>
          <p>
            There’s a little more to understand. And a whole village to help.
          </p>
        </div>
        <span className="grade-tag">
          GRADE {data.grade}
          <span>•</span>
          {data.language}
        </span>
      </div>
      <div className="dashboard-layout">
        <div className="dashboard-primary">
          <section className="continue-card">
            <div>
              <Eyebrow>YOUR NEXT AHA MOMENT</Eyebrow>
              <span className="tiny-pill">
                {next.subject} · {next.minutes} min
              </span>
              <h2>
                {next.id === "fractions" ? "Fractions," : next.title}
                {next.id === "fractions" && <em>made familiar.</em>}
              </h2>
              <p>
                {next.subtitle}{" "}
                {next.grade < data.grade
                  ? "A foundation worth revisiting."
                  : ""}
              </p>
              <div className="continue-progress">
                <Progress
                  value={data.progress[next.id] || 0}
                  label={`${next.title} progress`}
                />
                <span>{data.progress[next.id] || 0}%</span>
              </div>
              <ButtonLink to={`/lesson/${next.id}`} variant="ink">
                Continue learning <ArrowUpRight size={16} />
              </ButtonLink>
            </div>
            <div className="continue-art" aria-hidden="true">
              {next.subject === "Mathematics" ? (
                <>
                  <Roti filled={3} />
                  <span>It all adds up.</span>
                </>
              ) : (
                <BookOpen size={100} strokeWidth={0.7} />
              )}
            </div>
          </section>
          <div className="quick-actions">
            <Link to="/tutors">
              <span>
                <Users size={21} />
              </span>
              <div>
                <strong>Find your peer</strong>
                <small>A familiar kind of help.</small>
              </div>
              <ArrowUpRight size={18} />
            </Link>
            <Link to="/assistant">
              <span>
                <Sparkles size={21} />
              </span>
              <div>
                <strong>Ask a doubt</strong>
                <small>No question too small.</small>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <section className="dashboard-section">
            <div className="section-heading">
              <h2>
                Your learning, <em>taking shape.</em>
              </h2>
              <ArrowLink to="/explore">All subjects</ArrowLink>
            </div>
            <div className="dashboard-subjects">
              {subjects.map((subject, i) => {
                const list = lessons.filter((l) => l.subject === subject);
                const value = Math.round(
                  list.reduce((n, l) => n + (data.progress[l.id] || 0), 0) /
                    list.length,
                );
                return (
                  <Link
                    to={`/explore?subject=${encodeURIComponent(subject)}`}
                    className="dashboard-subject"
                    key={subject}
                  >
                    <span className={`subject-monogram ${colorFor[subject]}`}>
                      {["∑", "✳", "Aa", "◎"][i]}
                    </span>
                    <h3>{subject}</h3>
                    <p>
                      {list.length} demo{" "}
                      {list.length === 1 ? "lesson" : "lessons"}
                      <ArrowUpRight size={16} />
                    </p>
                    <Progress value={value} label={`${subject} progress`} />
                    <span className="small muted">{value}% topic mastery</span>
                  </Link>
                );
              })}
            </div>
          </section>
          <section className="dashboard-section next-steps">
            <Eyebrow icon>A LEARNING JOURNEY, NOT A TO-DO LIST</Eyebrow>
            <div className="journey-item">
              <span className="journey-marker">
                <Check size={15} />
              </span>
              <div>
                <strong>Start with what feels familiar</strong>
                <p>Fractions through the things you share every day.</p>
              </div>
              <Link to="/lesson/fractions" aria-label="Study fractions">
                <ChevronRight size={20} />
              </Link>
            </div>
            <div className="journey-item">
              <span className="journey-marker current">2</span>
              <div>
                <strong>
                  {data.progress.fractions === 100
                    ? "Ready for a new idea: linear equations"
                    : "Next: try the fractions checkpoint"}
                </strong>
                <p>
                  {data.progress.fractions === 100
                    ? "Your fractions checkpoint is complete. Try keeping an equation balanced."
                    : "A short question helps you find what clicked and what needs another look."}
                </p>
              </div>
              <Link
                to={
                  data.progress.fractions === 100
                    ? "/lesson/equations"
                    : "/lesson/fractions"
                }
                aria-label="Open recommended next topic"
              >
                <ChevronRight size={20} />
              </Link>
            </div>
          </section>
          <section className="dashboard-section">
            <div className="section-heading">
              <h2>
                From the <em>knowledge wall.</em>
              </h2>
              <ArrowLink to="/community">Take a look</ArrowLink>
            </div>
            <Link to="/lesson/photosynthesis" className="knowledge-mini sage">
              <span className="knowledge-mini-art">✳</span>
              <div>
                <Eyebrow>A SMALL IDEA WORTH SHARING</Eyebrow>
                <h3>The busiest kitchen is a leaf.</h3>
                <p>An everyday way to understand photosynthesis.</p>
              </div>
              <ArrowUpRight size={22} />
            </Link>
          </section>
        </div>
        <aside className="dashboard-aside">
          <section className="aside-panel">
            <div className="aside-heading">
              <CalendarDays size={18} />
              <h2>Learning together</h2>
            </div>
            {upcoming.length ? (
              upcoming.map((r) => (
                <div className="upcoming-mini" key={r.id}>
                  <Avatar
                    name={
                      tutors.find((t) => t.id === r.tutorId)?.name || "Aditi"
                    }
                  />
                  <strong>{r.topic}</strong>
                  <p>{r.scheduled} · IST</p>
                  <ButtonLink to="/sessions" variant="outline">
                    View session <ArrowUpRight size={15} />
                  </ButtonLink>
                </div>
              ))
            ) : (
              <>
                <div className="cal-illustration">
                  <span>YOUR NEXT</span>
                  <strong>aha.</strong>
                  <span>IS A CONVERSATION AWAY</span>
                </div>
                <p>
                  A little time with the right peer can make all the difference.
                </p>
                <ArrowLink to="/tutors">Plan a session</ArrowLink>
              </>
            )}
          </section>
          <section className="aside-panel progress-summary">
            <Eyebrow>YOUR SMALL WINS</Eyebrow>
            <div
              className="mastery-ring"
              style={{
                background: `conic-gradient(#315cfd ${average}%, #eeeee8 0)`,
              }}
            >
              <span>
                <strong>
                  {average}
                  <small>%</small>
                </strong>
                <small>demo mastery</small>
              </span>
            </div>
            <p>
              {fullyComplete} of {lessons.length} checkpoints completed
            </p>
            <div className="stat-row">
              <span>Practice sessions this visit</span>
              <strong>{completed.length}</strong>
            </div>
            <div className="stat-row">
              <span>Lessons saved for later</span>
              <strong>{data.saved.length}</strong>
            </div>
          </section>
          <section className="milestone-note">
            <Trophy size={24} strokeWidth={1.3} />
            <div>
              <h3>
                {fullyComplete
                  ? "A little more confident."
                  : "Your first “I get it”."}
              </h3>
              <p>
                {fullyComplete
                  ? "You completed a checkpoint. Understanding is worth celebrating."
                  : "Complete a checkpoint to mark a meaningful milestone."}
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
export function Explore() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const { data, saveLesson, online } = useStore();
  const subject = params.get("subject") || "All subjects";
  const filtered = lessons.filter(
    (l) =>
      (subject === "All subjects" || l.subject === subject) &&
      (!savedOnly || data.saved.includes(l.id)) &&
      `${l.title} ${l.subject} ${l.keywords.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="container page library-page">
      <div className="page-heading library-heading">
        <div>
          <Eyebrow>YOUR CURIOSITY HAS A HOME</Eyebrow>
          <h1>
            Small lessons.
            <br />
            <em>Lasting understanding.</em>
          </h1>
          <p>
            Familiar examples, a little practice, and space to find your own
            pace.
          </p>
        </div>
        <div className="library-heading-art" aria-hidden="true">
          A<span>b</span>
          <i>c.</i>
        </div>
      </div>
      <div className="library-toolbar">
        <label className="search-input">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you curious about?"
            aria-label="Search lessons"
          />
        </label>
        <Button
          variant={savedOnly ? "ink" : "outline"}
          onClick={() => setSavedOnly((v) => !v)}
          aria-pressed={savedOnly}
        >
          <Bookmark size={16} />
          Saved lessons{data.saved.length > 0 && ` (${data.saved.length})`}
        </Button>
      </div>
      <div className="filter-tabs" role="group" aria-label="Filter by subject">
        {["All subjects", ...subjects].map((s) => (
          <button
            key={s}
            className={subject === s ? "active" : ""}
            aria-pressed={subject === s}
            onClick={() =>
              setParams(s === "All subjects" ? {} : { subject: s })
            }
          >
            {s}
          </button>
        ))}
      </div>
      <div className="results-line">
        <span>
          {filtered.length} {filtered.length === 1 ? "lesson" : "lessons"} to
          explore
        </span>
        <span>
          <BookOpen size={14} />
          Original learning notes · not an official curriculum index
        </span>
      </div>
      {filtered.length ? (
        <div className="lesson-grid">
          {filtered.map((l, i) => (
            <article className="lesson-card" key={l.id}>
              <Link
                className={`lesson-cover ${colorFor[l.subject]}`}
                to={`/lesson/${l.id}`}
                aria-label={`Study ${l.title}`}
              >
                <span className="lesson-cover-meta">
                  {l.subject.toUpperCase()}
                  <span>0{lessons.indexOf(l) + 1}</span>
                </span>
                <div className={`lesson-cover-art art-${l.id}`}>
                  {l.id === "fractions" ? (
                    <Roti filled={3} />
                  ) : l.id === "equations" ? (
                    <span>
                      x + 5 = <em>12</em>
                    </span>
                  ) : l.id === "photosynthesis" ? (
                    <span>
                      Sun.
                      <br />
                      Leaf.
                      <br />
                      <em>Life.</em>
                    </span>
                  ) : l.id === "tenses" ? (
                    <span>
                      Once
                      <br />
                      <em>upon a time.</em>
                    </span>
                  ) : l.id === "water" ? (
                    <span>
                      Round
                      <br />& <em>round.</em>
                    </span>
                  ) : (
                    <span>
                      Your village.
                      <br />
                      <em>Your voice.</em>
                    </span>
                  )}
                </div>
                <span className="cover-bottom">
                  ONE IDEA AT A TIME
                  <ArrowUpRight size={19} />
                </span>
              </Link>
              <button
                className={`save-button ${data.saved.includes(l.id) ? "is-saved" : ""}`}
                aria-label={`${data.saved.includes(l.id) ? "Unsave" : "Save"} ${l.title}`}
                aria-pressed={data.saved.includes(l.id)}
                onClick={() => saveLesson(l.id)}
              >
                {data.saved.includes(l.id) ? (
                  <BookmarkCheck size={18} />
                ) : (
                  <Bookmark size={18} />
                )}
              </button>
              <div className="lesson-card-body">
                <div className="lesson-meta">
                  Grade {l.grade}
                  <span>·</span>
                  <Clock3 size={13} />
                  {l.minutes} min
                </div>
                <h2>
                  <Link to={`/lesson/${l.id}`}>
                    {l.title}
                    <ArrowUpRight size={17} />
                  </Link>
                </h2>
                <p>{l.subtitle}</p>
                <div className="lesson-progress">
                  <Progress
                    value={data.progress[l.id] || 0}
                    label={`${l.title} progress`}
                  />
                  <span>{data.progress[l.id] || 0}%</span>
                </div>
                <span className="lesson-index">
                  LESSON {String(i + 1).padStart(2, "0")} · LEARN, THEN TRY
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            savedOnly ? "A little space for later." : "No lessons found, yet."
          }
          description={
            savedOnly
              ? "Save a lesson using its bookmark. You can find it here next time."
              : "Try a different word or explore another subject."
          }
        >
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setSavedOnly(false);
              setParams({});
            }}
          >
            Explore all lessons
          </Button>
        </EmptyState>
      )}
      <div className="library-note">
        <WifiOff size={20} />
        <div>
          <strong>Good reading should stay within reach.</strong>
          <p>
            {online
              ? "This lightweight demo caches its app and lessons after a successful production load. Bookmarks and quiz progress stay on this device."
              : "You are offline. This loaded demo library is available on your device."}{" "}
            Server synchronization is not connected.
          </p>
        </div>
      </div>
    </div>
  );
}
export function LessonPage() {
  const { id } = useParams();
  const lesson = lessons.find((l) => l.id === id);
  const { data, saveLesson, completeLesson } = useStore();
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    setAnswer(null);
    setChecked(false);
  }, [id]);
  if (!lesson)
    return (
      <div className="container page">
        <EmptyState
          title="This lesson hasn’t arrived yet."
          description="There are a few other ideas waiting for you."
        >
          <ButtonLink to="/explore">Explore the library</ButtonLink>
        </EmptyState>
      </div>
    );
  const correct = answer === lesson.answer;
  return (
    <div className="container page lesson-page">
      <Link className="back-link" to="/explore">
        <ArrowLeft size={16} />
        Back to the library
      </Link>
      <div className="reading-layout">
        <article className="reading-content">
          <Eyebrow>
            {lesson.subject.toUpperCase()} · GRADE {lesson.grade} ·{" "}
            {lesson.minutes} MINUTE READ
          </Eyebrow>
          <h1>{lesson.title}</h1>
          <p className="reading-subtitle">{lesson.subtitle}</p>
          <div className="reading-source">
            <BookOpen size={15} />
            Original demo learning note · no claim of NCERT verification
          </div>
          <div className={`lesson-intro ${colorFor[lesson.subject]}`}>
            <Lightbulb size={23} />
            <p>{lesson.concept}</p>
          </div>
          <h2>
            Let’s make it <em>make sense.</em>
          </h2>
          <ol className="lesson-steps">
            {lesson.steps.map((s, i) => (
              <li key={s}>
                <span>0{i + 1}</span>
                <p>{s}</p>
              </li>
            ))}
          </ol>
          <div className="everyday-example">
            <Eyebrow>BRING IT BACK TO EVERYDAY LIFE</Eyebrow>
            <p>{lesson.example}</p>
            {id === "fractions" && (
              <div className="reading-rotis">
                <Roti filled={2} />
                <span>+</span>
                <Roti filled={1} />
                <span>=</span>
                <Roti filled={3} />
              </div>
            )}
          </div>
          <section className="checkpoint" aria-labelledby="checkpoint-title">
            <Eyebrow icon>A LITTLE CHECKPOINT</Eyebrow>
            <h2 id="checkpoint-title">Your turn to try.</h2>
            <p>{lesson.question}</p>
            <fieldset disabled={checked}>
              <legend className="sr-only">Choose an answer</legend>
              {lesson.options.map((option, i) => (
                <label
                  className={`answer-option ${answer === i ? "selected" : ""}`}
                  key={option}
                >
                  <input
                    type="radio"
                    name="answer"
                    checked={answer === i}
                    onChange={() => setAnswer(i)}
                  />
                  <span>{String.fromCharCode(65 + i)}</span>
                  {option}
                  {checked && i === lesson.answer && <Check size={18} />}
                </label>
              ))}
            </fieldset>
            {checked ? (
              <div
                className={`answer-feedback ${correct ? "correct" : "try-again"}`}
                role="status"
              >
                <strong>
                  {correct
                    ? "That’s it. A little more understood."
                    : "A good place to try another way."}
                </strong>
                <p>{lesson.explanation}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setChecked(false);
                    setAnswer(null);
                  }}
                >
                  Try the checkpoint again
                </Button>
              </div>
            ) : (
              <Button
                disabled={answer === null}
                onClick={() => {
                  setChecked(true);
                  if (correct) completeLesson(lesson.id, 100);
                }}
              >
                Check my understanding <ArrowRight size={16} />
              </Button>
            )}
          </section>
          <div className="reading-next">
            <p>Still a little unsure? That’s what learning is for.</p>
            <ButtonLink
              to={`/tutors?subject=${encodeURIComponent(lesson.subject)}`}
              variant="outline"
            >
              Talk it through with a peer
              <ArrowUpRight size={16} />
            </ButtonLink>
          </div>
        </article>
        <aside className="reading-aside">
          <div className="aside-panel">
            <Eyebrow>ONE IDEA AT A TIME</Eyebrow>
            <h3>Your learning note</h3>
            <p>Read the idea. Make it familiar. Try a little question.</p>
            <Progress
              value={data.progress[lesson.id] || 0}
              label="Lesson mastery"
            />
            <span className="small muted">
              {data.progress[lesson.id] || 0}% topic mastery
            </span>
            <Button
              variant="outline"
              className="full-width"
              onClick={() => saveLesson(lesson.id)}
            >
              {data.saved.includes(lesson.id) ? (
                <BookmarkCheck size={17} />
              ) : (
                <Bookmark size={17} />
              )}{" "}
              {data.saved.includes(lesson.id)
                ? "Saved on this device"
                : "Save for later"}
            </Button>
            <p className="small muted">
              A bookmark stays in this browser. Production offline caching
              becomes available after your first online visit.
            </p>
          </div>
          <div className="reading-help">
            <Sparkles size={20} />
            <h3>Try another explanation.</h3>
            <p>Explore a curated explanation in the Doubt Assistant.</p>
            <ArrowLink to={`/assistant?topic=${lesson.id}`}>
              Ask a little question
            </ArrowLink>
          </div>
        </aside>
      </div>
    </div>
  );
}
export function Community() {
  const { data, saveLesson } = useStore();
  const [subject, setSubject] = useState("All");
  const cards = useMemo(
    () =>
      knowledgeCards.filter((c) => subject === "All" || c.subject === subject),
    [subject],
  );
  return (
    <div className="container page community-page">
      <div className="page-heading">
        <Eyebrow>A LITTLE KNOWLEDGE GOES A LONG WAY</Eyebrow>
        <h1>
          Good ideas deserve
          <br />
          <em>to be passed around.</em>
        </h1>
        <p>
          Simple explanations. Familiar examples. A wall worth spending time
          with.
        </p>
      </div>
      <div className="subtle-notice">
        <ShieldIcon />
        <span>
          These are authored sample cards, not extracted student transcripts.
          Production publishing requires Local Champion approval and
          anonymization.
        </span>
      </div>
      <div
        className="filter-tabs"
        role="group"
        aria-label="Filter knowledge cards"
      >
        {["All", "Mathematics", "Science"].map((s) => (
          <button
            key={s}
            aria-pressed={subject === s}
            className={subject === s ? "active" : ""}
            onClick={() => setSubject(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="knowledge-grid">
        {cards.map((c, i) => (
          <article className={`knowledge-card ${c.color}`} key={c.id}>
            <div className="knowledge-meta">
              <span>{c.subject.toUpperCase()}</span>
              <span>NOTE 0{i + 1}</span>
            </div>
            <span className="knowledge-ornament" aria-hidden="true">
              {c.id === "roti" ? "¾" : c.id === "leaf" ? "✳" : "="}
            </span>
            <h2>{c.title}</h2>
            <p>{c.body}</p>
            <div className="knowledge-bottom">
              <span>{c.tag}</span>
              <button
                className="icon-button"
                onClick={() => saveLesson(c.lessonId)}
                aria-label={`${data.saved.includes(c.lessonId) ? "Unsave" : "Save"} ${c.title}`}
              >
                {data.saved.includes(c.lessonId) ? (
                  <BookmarkCheck size={19} />
                ) : (
                  <Bookmark size={19} />
                )}
              </button>
            </div>
            <Link className="text-link" to={`/lesson/${c.lessonId}`}>
              Explore the whole idea <ArrowUpRight size={16} />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
function ShieldIcon() {
  return <Check size={18} />;
}
