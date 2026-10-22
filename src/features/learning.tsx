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
  WifiOff,
} from "lucide-react";
import { lessons, knowledgeCards } from "../data/demo";
import { useStore } from "../lib/store";
import {
  ArrowLink,
  Button,
  ButtonLink,
  EmptyState,
  Eyebrow,
  Progress,
} from "../components/ui";
import { Roti } from "../components/learning-art";
import type { Subject } from "../domain/types";
import { curriculum } from "../data/curriculum";
import {
  lessonsFor,
  chaptersFor,
  chapterFor,
  tutorContextUrl,
} from "../domain/curriculum";
import {
  AcademicContextPicker,
  CoverageNote,
} from "../components/academic-context";
const colorFor: Record<Subject, string> = {
  Mathematics: "peach",
  Science: "sage",
  English: "butter",
  "Social Science": "blue",
};
export { LearnerDashboard as Dashboard } from "./role-dashboards";
export function Explore() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const { data, saveLesson, online, setPreferences } = useStore();
  const subject = [
    "Mathematics",
    "Science",
    "English",
    "Social Science",
  ].includes(params.get("subject") || "")
    ? (params.get("subject") as Subject)
    : data.subject;
  const context = { ...data, subject };
  const library = lessonsFor(lessons, context);
  const chapters = chaptersFor(curriculum, context);
  const chapterId = params.get("chapter");
  const filtered = library.filter(
    (l) =>
      (!chapterId || l.chapterId === chapterId) &&
      (!savedOnly || data.saved.includes(l.id)) &&
      `${l.title} ${l.subject} ${chapterFor(curriculum, l)?.title} ${l.keywords.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const savedCount = library.filter((l) => data.saved.includes(l.id)).length;
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
      <AcademicContextPicker subject={subject} onChange={() => setParams({})} />
      <CoverageNote />
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
          Saved lessons{savedCount > 0 && ` (${savedCount})`}
        </Button>
      </div>

      {chapters.length > 0 && (
        <div
          className="academic-chapters"
          role="group"
          aria-label="Filter by chapter"
        >
          <button aria-pressed={!chapterId} onClick={() => setParams({})}>
            All chapters
          </button>
          {chapters.map((c) => (
            <button
              key={c.id}
              aria-pressed={chapterId === c.id}
              onClick={() => setParams({ subject, chapter: c.id })}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}
      <div className="results-line">
        <span>
          {filtered.length} {filtered.length === 1 ? "lesson" : "lessons"} to
          explore
        </span>
        <span>
          <BookOpen size={14} />
          Grade {data.grade} · {subject} · {data.language}
        </span>
      </div>
      {filtered.length ? (
        <div className="lesson-grid">
          {filtered.map((l, i) => (
            <article className="lesson-card" key={l.id}>
              <Link
                className={`lesson-cover ${colorFor[l.subject]}`}
                to={`/lesson/${l.id}`}
                onClick={() => setPreferences({ subject: l.subject })}
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
                  ) : l.grade === 10 ? (
                    <span>
                      {l.id === "prime-factors" ? "Prime." : "Common."}
                      <br />
                      <em>
                        {l.id === "prime-factors" ? "By nature." : "Ground."}
                      </em>
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
                  <Link
                    to={`/lesson/${l.id}`}
                    onClick={() => setPreferences({ subject: l.subject })}
                  >
                    {l.title}
                    <ArrowUpRight size={17} />
                  </Link>
                </h2>
                <p>{l.subtitle}</p>
                <p className="small muted">
                  {chapterFor(curriculum, l)?.title} · Original practice
                </p>
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
            !library.length
              ? "Your curriculum has room to grow."
              : savedOnly
                ? "A little space for later."
                : "No lessons match these filters."
          }
          description={
            !library.length
              ? `No ${subject} lessons for Grade ${data.grade}, ${data.language}, on this board yet. Your saved work in other contexts is kept. Try another context above or find a tutor for help.`
              : savedOnly
                ? "Save a lesson using its bookmark. You can find it here next time."
                : "Try a different word or explore another subject."
          }
        >
          {library.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setSavedOnly(false);
                setParams({});
              }}
            >
              Clear lesson filters
            </Button>
          )}
          {!library.length && (
            <ButtonLink to={tutorContextUrl(context)} variant="outline">
              Find a tutor for this grade
            </ButtonLink>
          )}
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
  const { data, saveLesson, completeLesson, setPreferences } = useStore();
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    setAnswer(null);
    setChecked(false);
  }, [id, data.boardId, data.grade, data.language, data.subject]);
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
  const eligible = lessonsFor(lessons, data).some((l) => l.id === lesson.id);
  if (!eligible)
    return (
      <div className="container page">
        <EmptyState
          title="This lesson belongs to another academic context."
          description={`This is ${curriculum.boards.find((b) => b.id === lesson.boardId)?.name} Grade ${lesson.grade}, ${lesson.subject}, in ${lesson.language}. Your current selection is Grade ${data.grade}, ${data.subject}, ${data.language}. Choose the matching context to study it; your existing progress is kept.`}
        >
          <Button
            onClick={() =>
              setPreferences({
                boardId: lesson.boardId,
                grade: lesson.grade,
                subject: lesson.subject,
                language: lesson.language,
              })
            }
          >
            Study in this lesson’s context
          </Button>
          <ButtonLink to="/explore" variant="outline">
            Back to My Learning
          </ButtonLink>
        </EmptyState>
      </div>
    );
  const chapter = chapterFor(curriculum, lesson)!;
  const assessment = curriculum.assessments.find(
    (a) => a.id === lesson.assessmentId,
  )!;
  const sequence = lessonsFor(lessons, {
    ...data,
    subject: lesson.subject,
  }).filter((l) => l.chapterId === lesson.chapterId);
  const position = sequence.findIndex((l) => l.id === id);
  const correct = answer === assessment.answer;

  return (
    <div className="container page lesson-page">
      <Link className="back-link" to="/explore">
        <ArrowLeft size={16} />
        Back to the library
      </Link>
      <nav className="academic-breadcrumb" aria-label="Academic breadcrumb">
        <Link to="/explore">
          {curriculum.boards.find((b) => b.id === lesson.boardId)?.name} · Grade{" "}
          {lesson.grade}
        </Link>
        <span>›</span>
        <Link to={`/explore?subject=${encodeURIComponent(lesson.subject)}`}>
          {lesson.subject}
        </Link>
        <span>›</span>
        <Link
          to={`/explore?subject=${encodeURIComponent(lesson.subject)}&chapter=${lesson.chapterId}`}
        >
          {chapter.title}
        </Link>
        <span>›</span>
        <span>Lesson & practice</span>
      </nav>
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
            Village Vidya original practice · not an official textbook lesson
          </div>
          <p className="academic-source">
            {chapter.source ? (
              <>
                Chapter metadata reference:{" "}
                <a href={chapter.source.url} target="_blank" rel="noreferrer">
                  {chapter.source.title}
                </a>{" "}
                · {chapter.source.edition}. This original practice covers a
                small part of the chapter.
              </>
            ) : (
              "Supplementary practice. No official chapter mapping has been verified."
            )}
          </p>
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
            <p>{assessment.question}</p>
            <fieldset disabled={checked}>
              <legend className="sr-only">Choose an answer</legend>
              {assessment.options.map((option, i) => (
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
                  {checked && i === assessment.answer && <Check size={18} />}
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
                <p>{assessment.explanation}</p>
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
                  completeLesson(lesson.id, correct ? 100 : 0);
                }}
              >
                Check my understanding <ArrowRight size={16} />
              </Button>
            )}
          </section>
          <div className="reading-next">
            <p>Still a little unsure? That’s what learning is for.</p>
            <ButtonLink
              to={tutorContextUrl(
                { ...data, subject: lesson.subject },
                lesson.id,
              )}
              variant="outline"
            >
              Talk it through with a peer
              <ArrowUpRight size={16} />
            </ButtonLink>
          </div>
          <nav className="lesson-sequence" aria-label="Lesson sequence">
            {sequence[position - 1] && (
              <Link to={`/lesson/${sequence[position - 1].id}`}>
                ← {sequence[position - 1].title}
              </Link>
            )}
            {sequence[position + 1] ? (
              <Link to={`/lesson/${sequence[position + 1].id}`}>
                Next: {sequence[position + 1].title} →
              </Link>
            ) : (
              <Link to="/learn/progress">View progress →</Link>
            )}
          </nav>
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
              {data.progress[lesson.id] || 0}% checkpoint progress
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
