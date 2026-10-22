import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import {
  Avatar,
  ArrowLink,
  Button,
  ButtonLink,
  Eyebrow,
  Progress,
} from "../components/ui";
import { useStore } from "../lib/store";
import { sampleEvaluation, tutors } from "../data/demo";
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
export function Studio() {
  const {
    data,
    setPreferences,
    requests,
    request,
    updateRequest,
    completed,
    toast,
  } = useStore();
  const [sampleVisible, setSampleVisible] = useState(true);
  const navigate = useNavigate();
  const own = completed.filter((s) => s.tutorId === "aditi");
  const tss = own.reduce(
    (score, s) => updateTSS(score, sessionScore(s.evaluation)),
    tutors[0].tss,
  );
  const pending = requests.filter(
    (r) => r.tutorId === "aditi" && r.status === "pending",
  );
  function sampleSession() {
    const r = request("aditi", "Mathematics", "Fractions, made familiar");
    updateRequest(r.id, "accepted");
    setSampleVisible(false);
    navigate(`/room/${r.id}`);
  }
  return (
    <div className="workspace-page studio-page">
      <div className="page-heading dashboard-heading">
        <div>
          <Eyebrow>A LITTLE KNOWLEDGE. A BIG DIFFERENCE.</Eyebrow>
          <h1>
            Keep growing, <em>Aditi.</em>
          </h1>
          <p>
            The best teachers are learners, too. Here’s your space for both.
          </p>
        </div>
        <label className="availability-toggle">
          <input
            type="checkbox"
            role="switch"
            checked={data.available}
            onChange={(e) => {
              setPreferences({ available: e.target.checked });
              toast(
                e.target.checked
                  ? "Your fictional availability is on."
                  : "Your fictional availability is paused.",
              );
            }}
          />
          <span className="switch-track" />
          <span>
            {data.available ? "Available to help" : "Taking a little pause"}
          </span>
        </label>
      </div>
      <div className="studio-stats">
        <div>
          <span>
            <Users size={18} />
            LESSONS SHARED
          </span>
          <strong>
            {38 + own.length}
            <small>sample history</small>
          </strong>
        </div>
        <div>
          <span>
            <Sparkles size={18} />
            TEACHING SKILL SCORE
          </span>
          <strong>
            {tss.toFixed(1)}
            <small>/ 100 · demo</small>
          </strong>
          <Progress value={tss} label="Demo Teaching Skill Score" />
        </div>
        <div>
          <span>
            <Trophy size={18} />
            YOUR SKILL LADDER
          </span>
          <strong className="tier-stat">Village Guide</strong>
          <span className="small muted">TSS ≥ 90 · a little more to give</span>
        </div>
      </div>
      <div className="studio-layout">
        <div>
          <section className="studio-section">
            <div className="section-heading">
              <div>
                <Eyebrow>SOMEONE COULD USE YOUR KIND OF HELP</Eyebrow>
                <h2>
                  Open <em>conversations.</em>
                </h2>
              </div>
              <span className="small muted">Fictional requests</span>
            </div>
            {pending.map((r) => (
              <article className="tutor-request" key={r.id}>
                <Avatar name="Aarav" color="sage" />
                <div>
                  <h3>Aarav could use a little help.</h3>
                  <p>
                    {r.topic} · Grade {data.grade} · {data.language}
                  </p>
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateRequest(r.id, "accepted");
                      navigate(`/room/${r.id}`);
                    }}
                  >
                    Accept <Check size={15} />
                  </Button>
                  <button
                    className="icon-button"
                    aria-label="Decline request"
                    onClick={() => updateRequest(r.id, "declined")}
                  >
                    <X size={18} />
                  </button>
                </div>
              </article>
            ))}
            {sampleVisible ? (
              <article className="tutor-request">
                <Avatar name="Aarav" color="sage" />
                <div>
                  <Eyebrow>SAMPLE REQUEST</Eyebrow>
                  <h3>“Fractions feel a little confusing.”</h3>
                  <p>Aarav · Grade 8 · English / मराठी</p>
                  <span>
                    <Clock3 size={12} />
                    30-minute local practice
                  </span>
                </div>
                <div>
                  <Button variant="outline" onClick={sampleSession}>
                    Try teaching <ArrowUpRight size={15} />
                  </Button>
                  <button
                    className="icon-button"
                    aria-label="Dismiss sample request"
                    onClick={() => setSampleVisible(false)}
                  >
                    <X size={17} />
                  </button>
                </div>
              </article>
            ) : (
              pending.length === 0 && (
                <div className="quiet-empty">
                  <Check size={21} />
                  <p>A little breathing room. No open requests.</p>
                  <button
                    className="text-link"
                    onClick={() => setSampleVisible(true)}
                  >
                    Restore the sample request
                    <ArrowRight size={14} />
                  </button>
                </div>
              )
            )}
          </section>
          <section className="studio-coaching">
            <div className="studio-coaching-heading">
              <Sparkles size={22} />
              <span>YOUR CO-TEACHER NOTEBOOK</span>
              <span className="tiny-pill">Sample evaluation</span>
            </div>
            <h2>
              A good explanation.
              <br />
              <em>An even better next one.</em>
            </h2>
            <p>
              Your last sample lesson used a familiar analogy to make fractions
              feel approachable. Next time, give the learner a chance to explain
              it back.
            </p>
            <div className="coaching-footer">
              <span>
                <strong>{sessionScore(sampleEvaluation).toFixed(1)}</strong>/100
                sample session score
              </span>
              <ArrowLink to="/studio/feedback">
                Read the full feedback
              </ArrowLink>
            </div>
          </section>
          <section className="studio-section skill-ladder">
            <div className="section-heading">
              <h2>
                A little higher, <em>together.</em>
              </h2>
              <Trophy size={22} strokeWidth={1.3} />
            </div>
            <div className="ladder-track">
              {[
                { name: "Helper", score: 50 },
                { name: "Explainer", score: 70 },
                { name: "Mentor", score: 82 },
                { name: "Village Guide", score: 90 },
              ].map((tier, i) => (
                <div className={i === 3 ? "current" : ""} key={tier.name}>
                  <span>
                    {i === 3 ? <Trophy size={19} /> : <Check size={17} />}
                  </span>
                  <strong>{tier.name}</strong>
                  <small>TSS ≥ {tier.score}</small>
                </div>
              ))}
            </div>
            <p>
              Mentor uses the SRS example qualification of at least 25 sessions.
              A score dip allows three coaching sessions before tier demotion.
              TSS below 50 pauses all new matches immediately.
            </p>
          </section>
        </div>
        <aside>
          <section className="aside-panel growth-goal">
            <Target size={24} strokeWidth={1.4} />
            <Eyebrow>ONE THING TO TRY THIS WEEK</Eyebrow>
            <h3>Give the learner the last word.</h3>
            <p>
              End your next lesson with: “How would you explain this to a
              friend?”
            </p>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={data.goal}
                onChange={(e) => setPreferences({ goal: e.target.checked })}
              />
              <span>
                {data.goal
                  ? "Tried it. A little growth."
                  : "I tried this in a practice lesson"}
              </span>
            </label>
          </section>
          <section className="aside-panel studio-availability">
            <CalendarDays size={21} />
            <h3>Make a little time.</h3>
            <p>
              Your sample availability is visible to learners in this browser.
            </p>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={data.available}
                onChange={(e) =>
                  setPreferences({ available: e.target.checked })
                }
              />
              Available for practice now
            </label>
            <div className="availability-slot">
              <span>Weekdays</span>
              <strong>5:00–7:00 PM IST</strong>
            </div>
            <span className="small muted">
              Illustrative schedule. Real calendar booking is not connected.
            </span>
          </section>
          <div className="studio-kind-note">
            <span>✳</span>
            <p>
              You don’t have to know everything.
              <br />
              <em>Just help someone understand a little more.</em>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
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
