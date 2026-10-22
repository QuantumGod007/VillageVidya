import { ArrowUpRight, Sparkles, Target, ChevronRight } from "lucide-react";
import { ButtonLink, Eyebrow, Progress } from "../components/ui";
import { useStore } from "../lib/store";
import { sampleEvaluation } from "../data/demo";
import { sessionScore, updateTSS, displayScore } from "../domain/learning";
const dimensions = [
  {
    key: "correctness",
    name: "Correctness",
    weight: 30,
    detail: "The core idea is accurate.",
  },
  {
    key: "completeness",
    name: "Completeness",
    weight: 25,
    detail: "Bring the explanation back to the original question.",
  },
  {
    key: "clarity",
    name: "Clarity",
    weight: 20,
    detail: "Familiar language makes the idea approachable.",
  },
  {
    key: "reasoning",
    name: "Reasoning",
    weight: 15,
    detail: "Explain why the denominator stays the same.",
  },
  {
    key: "tone",
    name: "Tone",
    weight: 10,
    detail: "Patient, encouraging, and respectful.",
  },
] as const;
export { TutorDashboard as Studio } from "./role-dashboards";
export function Feedback() {
  const { completed, data, setPreferences } = useStore();
  const score = sessionScore(sampleEvaluation);
  const next = updateTSS(92, score);
  const sessions = completed.filter((s) => s.tutorId === "aditi");
  return (
    <div className="workspace-page feedback-page">
      <div className="page-heading">
        <Eyebrow>YOUR CO-TEACHER NOTEBOOK</Eyebrow>
        <h1>
          Teaching is learning,
          <br />
          <em>twice over.</em>
        </h1>
        <p>A thoughtful look at one explanation, and a clear next step.</p>
      </div>
      <div className="evaluation-notice">
        <Sparkles size={18} />
        <div>
          <strong>Illustrative evaluation, not live AI analysis</strong>
          <p>
            The five scores below are sample data. The weighted total and TSS
            update are calculated using the SRS formulas. This report does not
            analyze text you type.
          </p>
        </div>
      </div>
      <div className="feedback-main-grid">
        <div>
          <section className="report-score-card">
            <div>
              <Eyebrow>SAMPLE LESSON · FRACTIONS, MADE FAMILIAR</Eyebrow>
              <h2>
                A clear idea.
                <br />
                <em>A confident learner.</em>
              </h2>
              <p>
                Correctness and kindness are your strengths. A little more “why”
                can make the reasoning stick.
              </p>
            </div>
            <div className="report-score">
              <strong>{score.toFixed(1)}</strong>
              <span>/100 SESSION SCORE</span>
            </div>
          </section>
          <section className="rubric-section">
            <div className="section-heading">
              <h2>
                Five ways to <em>grow.</em>
              </h2>
              <span className="small muted">SRS weighted rubric</span>
            </div>
            {dimensions.map((d) => (
              <div className="rubric-row" key={d.key}>
                <div>
                  <strong>
                    {d.name}
                    <span>{d.weight}% weight</span>
                  </strong>
                  <p>{d.detail}</p>
                </div>
                <Progress
                  value={sampleEvaluation[d.key]}
                  label={`${d.name} sample evaluation`}
                />
                <span>{sampleEvaluation[d.key]}</span>
              </div>
            ))}
          </section>
          <section className="coaching-actions">
            <Eyebrow icon>TAKE THIS INTO YOUR NEXT LESSON</Eyebrow>
            <div>
              <span>01</span>
              <div>
                <h3>Keep the familiar examples.</h3>
                <p>
                  The roti analogy makes an abstract idea easy to picture. Start
                  from something the learner knows.
                </p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <h3>Make the “why” visible.</h3>
                <p>
                  Explain why the pieces need to be the same size before adding.
                  Let the learner draw the equal parts.
                </p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <h3>End with their explanation.</h3>
                <p>
                  Ask the learner to teach the idea back. Their words show you
                  what they understand.
                </p>
              </div>
            </div>
          </section>
        </div>
        <aside>
          <section className="aside-panel tss-update">
            <Eyebrow>GROWTH IS A PRACTICE</Eyebrow>
            <h3>
              A little more
              <br />
              <em>with every lesson.</em>
            </h3>
            <div className="tss-comparison">
              <span>
                <small>Previous TSS</small>
                <strong>92.00</strong>
              </span>
              <ChevronRight size={19} />
              <span>
                <small>Sample next TSS</small>
                <strong>{displayScore(next, 2)}</strong>
              </span>
            </div>
            <div className="formula-note">
              0.85 × 92 + 0.15 × {score.toFixed(1)}
              <br />= {next.toFixed(3)}
            </div>
            <p>
              The score reflects a weighted moving average, not an instant
              judgement of a teacher.
            </p>
          </section>
          <section className="aside-panel">
            <Target size={22} />
            <h3>Your growth goal</h3>
            <p>Invite your learner to explain it back.</p>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={data.goal}
                onChange={(e) => setPreferences({ goal: e.target.checked })}
              />
              Mark as practised
            </label>
          </section>
          <section className="aside-panel">
            <Eyebrow>THIS VISIT’S PRACTICE</Eyebrow>
            <h3>
              {sessions.length} completed{" "}
              {sessions.length === 1 ? "session" : "sessions"}
            </h3>
            {sessions.length ? (
              sessions.map((s) => (
                <div className="performance-history" key={s.id}>
                  <span>{s.topic}</span>
                  <strong>{sessionScore(s.evaluation).toFixed(1)}</strong>
                  <small>Sample evaluation applied</small>
                </div>
              ))
            ) : (
              <p>
                Finish a practice session to add it to this visit’s history.
              </p>
            )}
            <ButtonLink to="/studio" variant="outline">
              Back to the studio
              <ArrowUpRight size={15} />
            </ButtonLink>
          </section>
        </aside>
      </div>
    </div>
  );
}
