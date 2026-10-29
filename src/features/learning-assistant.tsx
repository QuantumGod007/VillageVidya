import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Lightbulb,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { Avatar, Button, ButtonLink, Eyebrow } from "../components/ui";
import {
  tutorContextUrl,
  type AcademicContext,
  type Assessment,
} from "../domain/curriculum";
import { redactContact } from "../domain/learning";
import type { Lesson } from "../domain/types";

interface GeneratedAnswer {
  title: string;
  explanation: string;
  steps: string[];
  example: string;
  followUp: string | null;
}

type TurnState = "pending" | "ai" | "curated" | "unavailable";
interface Turn {
  id: string;
  question: string;
  lessonId: string | null;
  state: TurnState;
  answer?: GeneratedAnswer;
}

interface ApiSuccess {
  ok: true;
  answer: GeneratedAnswer;
  lessonId: string | null;
}

function isGeneratedAnswer(value: unknown): value is GeneratedAnswer {
  if (!value || typeof value !== "object") return false;
  const answer = value as Record<string, unknown>;
  return (
    typeof answer.title === "string" &&
    typeof answer.explanation === "string" &&
    Array.isArray(answer.steps) &&
    answer.steps.every((step) => typeof step === "string") &&
    typeof answer.example === "string" &&
    (typeof answer.followUp === "string" || answer.followUp === null)
  );
}

function isApiSuccess(value: unknown): value is ApiSuccess {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  return (
    response.ok === true &&
    isGeneratedAnswer(response.answer) &&
    (typeof response.lessonId === "string" || response.lessonId === null)
  );
}

export function LearningAssistant({
  context,
  library,
  assessments,
  initialQuestion = "",
  getAccessToken,
}: {
  context: AcademicContext;
  library: readonly Lesson[];
  assessments: readonly Assessment[];
  initialQuestion?: string;
  getAccessToken?: () => Promise<string | null>;
}) {
  const [text, setText] = useState(initialQuestion);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkpoint, setCheckpoint] = useState<string | null>(null);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      requestId.current += 1;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (turns.length || loading)
      bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [turns.length, loading]);

  function matchedLesson(question: string, requested?: string | null) {
    if (requested) {
      const selected = library.find((lesson) => lesson.id === requested);
      if (selected) return selected;
    }
    const lower = question.toLowerCase();
    return (
      library.find(
        (lesson) =>
          lower.includes(lesson.title.toLowerCase()) ||
          lesson.keywords.some((keyword) => lower.includes(keyword.toLowerCase())),
      ) ?? null
    );
  }

  function setFallback(id: string, lessonId: string | null) {
    setTurns((current) =>
      current.map((turn) =>
        turn.id === id
          ? {
              ...turn,
              lessonId,
              state: lessonId ? "curated" : "unavailable",
              answer: undefined,
            }
          : turn,
      ),
    );
  }

  async function resolve(turn: Turn) {
    const currentRequest = ++requestId.current;
    controller.current?.abort();
    const activeController = new AbortController();
    controller.current = activeController;
    setLoading(true);
    try {
      const token = await getAccessToken?.();
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question: turn.question,
          context,
          ...(turn.lessonId ? { lessonId: turn.lessonId } : {}),
        }),
        signal: activeController.signal,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (currentRequest !== requestId.current) return;
      if (response.ok && isApiSuccess(payload)) {
        setTurns((current) =>
          current.map((item) =>
            item.id === turn.id
              ? {
                  ...item,
                  lessonId: payload.lessonId ?? item.lessonId,
                  state: "ai",
                  answer: payload.answer,
                }
              : item,
          ),
        );
      } else {
        setFallback(turn.id, turn.lessonId);
      }
    } catch {
      if (currentRequest === requestId.current && !activeController.signal.aborted)
        setFallback(turn.id, turn.lessonId);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }

  function send(question = text) {
    const clean = redactContact(question.trim())
      .replace(/\[contact removed\](?=[^\s.,!?;:])/g, "[contact removed] ")
      .trim();
    if (!clean || loading) return;
    setText("");
    setCheckpoint(null);
    const lesson = matchedLesson(clean);
    const turn: Turn = {
      id: crypto.randomUUID(),
      question: clean,
      lessonId: lesson?.id ?? null,
      state: "pending",
    };
    setTurns((current) => [...current, turn]);
    void resolve(turn);
  }

  function retry(turn: Turn) {
    if (loading) return;
    const next = { ...turn, state: "pending" as const, answer: undefined };
    setTurns((current) =>
      current.map((item) => (item.id === turn.id ? next : item)),
    );
    void resolve(next);
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
            requestId.current += 1;
            controller.current?.abort();
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
        <span>Village Vidya AI Learning Assistant</span>
        <span>
          Grade {context.grade} · {context.subject} · {context.language}
        </span>
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
              {library.length
                ? "Choose a question from your selected academic context, or ask about one of these practice topics."
                : "No authored explanations are available for this academic context yet. A peer tutor can help you choose a useful next step."}
            </p>
            <div className="suggested-prompts">
              {library.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => send(`Help me understand ${lesson.title}`)}
                >
                  Help me understand {lesson.title}
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((turn) => {
            const lesson = matchedLesson(turn.question, turn.lessonId);
            const assessment = assessments.find(
              (item) => item.id === lesson?.assessmentId,
            );
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
                    {turn.state === "pending" ? (
                      <p role="status">Preparing your explanation…</p>
                    ) : turn.state === "ai" && turn.answer ? (
                      <>
                        <span className="assistant-author">
                          VILLAGE VIDYA · AI-GENERATED EXPLANATION
                        </span>
                        <h2>{turn.answer.title}</h2>
                        <p>{turn.answer.explanation}</p>
                        <ol>
                          {turn.answer.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                        <div className="assistant-analogy">
                          <Lightbulb size={18} />
                          <p>{turn.answer.example}</p>
                        </div>
                        {turn.answer.followUp && (
                          <p className="small muted">Try next: {turn.answer.followUp}</p>
                        )}
                        <p className="small muted">
                          AI-generated explanations can make mistakes. Check important learning with your teacher.
                        </p>
                      </>
                    ) : lesson ? (
                      <>
                        <span className="assistant-author">
                          VILLAGE VIDYA · CURATED LESSON RESPONSE
                        </span>
                        <h2>{lesson.title}</h2>
                        <p>{lesson.concept}</p>
                        <ol>
                          {lesson.steps.slice(0, 3).map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                        <div className="assistant-analogy">
                          <Lightbulb size={18} />
                          <p>{lesson.example}</p>
                        </div>
                        <p className="small muted">
                          The AI assistant is unavailable, so this authored Village Vidya lesson response is shown instead.
                        </p>
                      </>
                    ) : (
                      <div className="assistant-fallback">
                        <h2>A good question needs a grounded answer.</h2>
                        <p>
                          We do not have a matching authored lesson response for this question. Please try again or work through it with a peer tutor.
                        </p>
                        <Button variant="outline" onClick={() => retry(turn)} disabled={loading}>
                          Try again
                        </Button>
                        <ButtonLink to={tutorContextUrl(context)} variant="outline">
                          Find a peer for tomorrow <ArrowUpRight size={15} />
                        </ButtonLink>
                      </div>
                    )}
                    {lesson && turn.state !== "pending" && (
                      <>
                        <div className="source-reference">
                          <BookOpen size={15} />
                          <div>
                            <strong>Source: Village Vidya original learning note</strong>
                            <span>
                              Grade {lesson.grade} · {lesson.language} · Not verified against an NCERT retrieval index.
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setCheckpoint((value) =>
                              value === turn.id ? null : turn.id,
                            )
                          }
                        >
                          <MessageCircle size={15} />
                          {checkpoint === turn.id
                            ? "Hide the checkpoint"
                            : "Try a little checkpoint"}
                        </Button>
                        {checkpoint === turn.id && (
                          <div className="inline-checkpoint">
                            <strong>{assessment?.question}</strong>
                            <p>{assessment?.explanation}</p>
                            <ButtonLink to={`/lesson/${lesson.id}`} variant="ghost">
                              Try the scored checkpoint <ArrowRight size={15} />
                            </ButtonLink>
                          </div>
                        )}
                      </>
                    )}
                    {turn.state !== "pending" && (
                      <div className="assistant-followups">
                        <span>ONE USEFUL NEXT STEP</span>
                        {lesson && (
                          <ButtonLink to={`/lesson/${lesson.id}`} variant="ghost">
                            Read the whole idea <ArrowUpRight size={15} />
                          </ButtonLink>
                        )}
                        <ButtonLink
                          to={tutorContextUrl(context, lesson?.id)}
                          variant="ghost"
                        >
                          Talk it through with a peer <ArrowUpRight size={15} />
                        </ButtonLink>
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
            <span>Preparing your explanation…</span>
          </div>
        )}
        <div ref={bottom} />
      </div>
      <div className="assistant-compose-area">
        <form
          className="assistant-composer"
          onSubmit={(event) => {
            event.preventDefault();
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
            disabled={loading}
            onChange={(event) => setText(event.target.value)}
            placeholder="What would you like to understand?"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
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
          Questions stay in memory for this visit. Do not include names, phone numbers, addresses, or other personal information. AI explanations can make mistakes and do not replace a teacher.
        </p>
      </div>
    </div>
  );
}
