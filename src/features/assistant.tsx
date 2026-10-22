import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Plus,
  Send,
  Sparkles,
  BookOpen,
  ArrowRight,
  Lightbulb,
  MessageCircle,
} from "lucide-react";
import { lessons } from "../data/demo";
import { useStore } from "../lib/store";
import { redactContact } from "../domain/learning";
import { Avatar, Button, ButtonLink, Eyebrow } from "../components/ui";
interface Turn {
  id: string;
  question: string;
  lessonId: string | null;
}
export function Assistant() {
  const [params] = useSearchParams();
  const chosen = lessons.find((l) => l.id === params.get("topic"));
  const { data } = useStore();
  const [text, setText] = useState(
    chosen ? `Help me understand ${chosen.title.toLowerCase()}` : "",
  );
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkpoint, setCheckpoint] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (turns.length || loading)
      bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [turns.length, loading]);
  function send(question = text) {
    if (!question.trim() || loading) return;
    const clean = redactContact(question.trim());
    setText("");
    setLoading(true);
    const match = lessons.find(
      (l) =>
        l.keywords.some((k) => clean.toLowerCase().includes(k)) ||
        clean.toLowerCase().includes(l.title.toLowerCase()),
    );
    timer.current = setTimeout(() => {
      setTurns((p) => [
        ...p,
        {
          id: crypto.randomUUID(),
          question: clean,
          lessonId: match?.id ?? null,
        },
      ]);
      setLoading(false);
      setCheckpoint(null);
    }, 600);
  }
  return (
    <div className="assistant-page">
      <div className="assistant-heading">
        <div>
          <Eyebrow icon>A LITTLE HELP WITH THE TRICKY BITS</Eyebrow>
          <h1>
            Every question
            <br />
            <em>is a good question.</em>
          </h1>
          <p>A calm space to work through an idea, one small step at a time.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setTurns([]);
            setText("");
            setCheckpoint(null);
          }}
          disabled={loading || !turns.length}
        >
          <Plus size={16} />
          New conversation
        </Button>
      </div>
      <div className="assistant-mode">
        <Sparkles size={16} />
        <span>Curated demo · authored explanations, not live AI</span>
        <span>Grade {data.grade}</span>
      </div>
      <div className="assistant-conversation" aria-live="polite">
        {!turns.length && !loading ? (
          <div className="assistant-welcome">
            <span className="assistant-sparkle">
              <Sparkles size={31} strokeWidth={1.2} />
            </span>
            <h2>
              Let’s start with
              <br />
              <em>what’s on your mind.</em>
            </h2>
            <p>
              Choose an example, or ask a question about a topic in our small
              demo library.
            </p>
            <div className="suggested-prompts">
              {[
                "How do I add fractions?",
                "How do plants make food?",
                "Help me solve a linear equation",
                "Explain past and present tense",
              ].map((q) => (
                <button key={q} onClick={() => send(q)}>
                  {q}
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((turn) => {
            const lesson = lessons.find((l) => l.id === turn.lessonId);
            return (
              <div className="assistant-turn" key={turn.id}>
                <div className="assistant-question">
                  <Avatar name="Aarav" color="sage" />
                  <p>{turn.question}</p>
                </div>
                <div className="assistant-answer">
                  <span className="assistant-answer-icon">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <span className="assistant-author">
                      VILLAGE VIDYA · CURATED EXAMPLE
                    </span>
                    {lesson ? (
                      <>
                        <h2>{lesson.title}</h2>
                        <p>{lesson.concept}</p>
                        <ol>
                          {lesson.steps.slice(0, 3).map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ol>
                        <div className="assistant-analogy">
                          <Lightbulb size={18} />
                          <p>{lesson.example}</p>
                        </div>
                        <div className="source-reference">
                          <BookOpen size={15} />
                          <div>
                            <strong>
                              Source: Village Vidya original learning note
                            </strong>
                            <span>
                              Grade {lesson.grade} foundations · Not verified
                              against an NCERT retrieval index.
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setCheckpoint((v) =>
                              v === turn.id ? null : turn.id,
                            )
                          }
                        >
                          <CheckIcon />
                          {checkpoint === turn.id
                            ? "Hide the checkpoint"
                            : "Try a little checkpoint"}
                        </Button>
                        {checkpoint === turn.id && (
                          <div className="inline-checkpoint">
                            <strong>{lesson.question}</strong>
                            <p>{lesson.explanation}</p>
                            <ButtonLink
                              to={`/lesson/${lesson.id}`}
                              variant="ghost"
                            >
                              Try the scored checkpoint <ArrowRight size={15} />
                            </ButtonLink>
                          </div>
                        )}
                        <div className="assistant-followups">
                          <span>ONE USEFUL NEXT STEP</span>
                          <ButtonLink
                            to={`/lesson/${lesson.id}`}
                            variant="ghost"
                          >
                            Read the whole idea
                            <ArrowUpRight size={15} />
                          </ButtonLink>
                          <ButtonLink
                            to={`/tutors?subject=${encodeURIComponent(lesson.subject)}`}
                            variant="ghost"
                          >
                            Talk it through with a peer
                            <ArrowUpRight size={15} />
                          </ButtonLink>
                        </div>
                      </>
                    ) : (
                      <div className="assistant-fallback">
                        <h2>A good question needs a grounded answer.</h2>
                        <p>
                          This demo doesn’t have a verified explanation for that
                          question. I won’t invent one. A peer tutor can help
                          you work it through.
                        </p>
                        <ButtonLink to="/tutors" variant="outline">
                          Find a peer for tomorrow <ArrowUpRight size={16} />
                        </ButtonLink>
                        <p className="small muted">
                          Live curriculum retrieval and AI services are not
                          connected.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {loading && (
          <div className="assistant-loading" role="status">
            <Sparkles size={18} />
            <span>Finding a familiar way to explain it…</span>
          </div>
        )}
        <div ref={bottom} />
      </div>
      <div className="assistant-compose-area">
        <form
          className="assistant-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label className="sr-only" htmlFor="doubt-question">
            Your learning question
          </label>
          <textarea
            id="doubt-question"
            rows={1}
            value={text}
            maxLength={1200}
            onChange={(e) => setText(e.target.value)}
            placeholder="What would you like to understand?"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            className="send-button"
            disabled={!text.trim() || loading}
            aria-label="Ask question"
          >
            <Send size={18} />
          </button>
        </form>
        <p>
          Questions stay in memory for this visit. Curated samples explain
          ideas; they do not replace a teacher.
        </p>
      </div>
    </div>
  );
}
function CheckIcon() {
  return <MessageCircle size={15} />;
}
