import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ShieldCheck,
  Heart,
  Check,
  FileText,
  Database,
  Server,
  MessageCircle,
  BookOpen,
  LockKeyhole,
  RefreshCw,
  Globe2,
  Wifi,
  Download,
  Users,
} from "lucide-react";
import { useStore } from "../lib/store";
import { lessons } from "../data/demo";
import {
  ArrowLink,
  Button,
  ButtonLink,
  Eyebrow,
  Modal,
  Progress,
} from "../components/ui";
import type { Language } from "../domain/types";
export function Guardian() {
  const { data, completed } = useStore();
  const [language, setLanguage] = useState<Language>(data.language);
  const [consent, setConsent] = useState(false);
  const count = completed.length;
  const learned = lessons.filter((l) => data.progress[l.id] === 100).length;
  const digest: Record<Language, string> = {
    English: `Village Vidya: Aarav completed ${count} practice sessions and ${learned} learning checkpoints. A little progress, together. Demo only.`,
    हिन्दी: `विलेज विद्या: आरव ने ${count} अभ्यास सत्र और ${learned} सीखने के चरण पूरे किए। साथ सीखें, आगे बढ़ें। केवल डेमो।`,
    मराठी: `व्हिलेज विद्या: आरवने ${count} सराव सत्रे आणि ${learned} अभ्यास टप्पे पूर्ण केले. एकत्र शिकूया. केवळ डेमो.`,
    తెలుగు: `విలేజ్ విద్య: ఆరవ్ ${count} సాధన సెషన్లు, ${learned} అభ్యాస దశలు పూర్తి చేశాడు. కలిసి నేర్చుకుందాం. డెమో మాత్రమే.`,
  };
  return (
    <div className="workspace-page guardian-page">
      <div className="page-heading">
        <Eyebrow>A LITTLE CLOSER TO THEIR WORLD</Eyebrow>
        <h1>
          Learning grows
          <br />
          <em>with your support.</em>
        </h1>
        <p>A simple window into Aarav’s fictional learning journey.</p>
      </div>
      <div className="guardian-layout">
        <section id="progress" tabIndex={-1} className="guardian-summary">
          <div className="guardian-summary-title">
            <Heart size={24} />
            <div>
              <Eyebrow>YOUR LEARNER</Eyebrow>
              <h2>Aarav’s small steps.</h2>
            </div>
            <span>Fictional profile</span>
          </div>
          <div className="guardian-stats">
            <div>
              <strong>{count}</strong>
              <span>practice sessions this visit</span>
            </div>
            <div>
              <strong>{learned}</strong>
              <span>checkpoints understood</span>
            </div>
          </div>
          {["Mathematics", "Science", "English"].map((s) => {
            const list = lessons.filter((l) => l.subject === s);
            const value = Math.round(
              list.reduce((n, l) => n + (data.progress[l.id] || 0), 0) /
                list.length,
            );
            return (
              <div className="guardian-subject" key={s}>
                <span>{s}</span>
                <Progress value={value} label={`${s} demo mastery`} />
                <strong>{value}%</strong>
              </div>
            );
          })}
          <div className="guardian-conversation">
            <MessageCircle size={20} />
            <p>
              <strong>One lovely question to ask today</strong>“What was one
              thing that made more sense?”
            </p>
          </div>
        </section>
        <section id="updates" tabIndex={-1} className="guardian-digest">
          <Eyebrow>NO APP REQUIRED, IN THE PRODUCTION DESIGN</Eyebrow>
          <h2>
            A small message.
            <br />
            <em>A meaningful connection.</em>
          </h2>
          <p>
            A preview of the weekly digest planned for Sunday, 6:00 PM IST.
            Nothing is sent.
          </p>
          <label className="field">
            Digest language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              {["English", "हिन्दी", "मराठी", "తెలుగు"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <div className="sms-preview">
            <span>VILLAGE VIDYA · SAMPLE SMS</span>
            <p>{digest[language].slice(0, 140)}</p>
            <small>
              {Math.min(digest[language].length, 140)}/140 characters · not
              delivered
            </small>
          </div>
          <span className="small muted">
            Regional SMS encoding and delivery receipts need provider
            integration.
          </span>
        </section>
      </div>
      <section id="consent" tabIndex={-1} className="consent-card">
        <ShieldCheck size={26} />
        <div>
          <h2>Trust begins with your permission.</h2>
          <p>
            The fictional guardian consent state can be previewed here. Real
            consent cannot be granted in this demo.
          </p>
          <div className="consent-status">
            <span className="status-dot" />
            {consent
              ? "Demo acknowledgement recorded on this screen"
              : "Production activation blocked · consent service not connected"}
          </div>
        </div>
        <Button variant="outline" onClick={() => setConsent((v) => !v)}>
          {consent ? "Reset preview" : "Preview acknowledgement"}
          <ArrowUpRight size={16} />
        </Button>
      </section>
    </div>
  );
}
export function Champion() {
  const { data, approve, toast } = useStore();
  const [detail, setDetail] = useState<string | null>(null);
  return (
    <div className="workspace-page champion-page">
      <div className="page-heading">
        <Eyebrow>THE TRUST AT THE HEART OF THE VILLAGE</Eyebrow>
        <h1>
          A little care.
          <br />
          <em>A safer community.</em>
        </h1>
        <p>Review fictional applications and learn the verification steps.</p>
      </div>
      <div className="evaluation-notice">
        <ShieldCheck size={20} />
        <div>
          <strong>Training workspace · no real verification</strong>
          <p>
            Approvals here affect sample records only. They never make a real
            person eligible to tutor a child.
          </p>
        </div>
      </div>
      <div className="champion-grid">
        <section id="verification" tabIndex={-1} className="trust-panel">
          <div className="section-heading">
            <h2>
              People to <em>meet.</em>
            </h2>
            <Users size={22} />
          </div>
          {[
            {
              id: "verification-kiran",
              name: "Kiran",
              meta: "Grade 11 · Mathematics · Marathi",
            },
            {
              id: "verification-anaya",
              name: "Anaya",
              meta: "Grade 12 · English · Hindi",
            },
          ].map((p) => (
            <div className="verification-row" key={p.id}>
              <span>{p.name[0]}</span>
              <div>
                <h3>{p.name}</h3>
                <p>{p.meta}</p>
                <small>
                  {data.approved.includes(p.id)
                    ? "Training review complete · still not a real verification"
                    : "In-person verification required · sample record"}
                </small>
              </div>
              <Button
                variant="outline"
                disabled={data.approved.includes(p.id)}
                onClick={() => setDetail(p.id)}
              >
                {data.approved.includes(p.id) ? (
                  <Check size={16} />
                ) : (
                  <>
                    Review
                    <ArrowUpRight size={15} />
                  </>
                )}
              </Button>
            </div>
          ))}
        </section>
        <section className="trust-panel">
          <Eyebrow>BEFORE THE FIRST LESSON</Eyebrow>
          <h2>
            Trust is built <em>in person.</em>
          </h2>
          <ol className="trust-checklist">
            <li>Meet the tutor at the local school.</li>
            <li>Confirm their academic grade and subject.</li>
            <li>Explain boundaries, consent, and reporting.</li>
            <li>Log a secure physical verification token.</li>
          </ol>
          <p className="small muted">
            Secure tokens, identity records, and real sign-off require a server.
            This release collects no identity documents.
          </p>
        </section>
        <section id="moderation" tabIndex={-1} className="trust-panel">
          <Eyebrow>IDEAS WORTH PASSING AROUND</Eyebrow>
          <h2>
            A note for <em>the wall.</em>
          </h2>
          <div className="moderation-sample">
            <strong>Equal pieces, easier fractions.</strong>
            <p>
              To add fractions, first make sure the pieces are the same size.
              Half a roti is two quarters.
            </p>
            <span>Authored sample · no student identifiers</span>
          </div>
          <Button
            variant="outline"
            disabled={data.approved.includes("knowledge-review")}
            onClick={() => {
              approve("knowledge-review");
              toast(
                "Sample card review recorded locally. No public card was published.",
              );
            }}
          >
            {data.approved.includes("knowledge-review")
              ? "Sample reviewed"
              : "Record sample review"}
            <Check size={16} />
          </Button>
        </section>
        <section
          id="reports"
          tabIndex={-1}
          className="trust-panel safety-panel"
        >
          <ShieldCheck size={25} />
          <h2>
            A calm place to <em>raise a concern.</em>
          </h2>
          <p>
            No live moderation queue is connected. A production queue will show
            escalated sessions only to authorized Champions and administrators.
          </p>
          <ArrowLink to="/about#safety">Read the safety design</ArrowLink>
        </section>
      </div>
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Practise a careful review"
      >
        <p className="muted">
          This is a fictional training record. Never use a demo review to
          confirm a real child’s tutor.
        </p>
        <ul className="check-list">
          <li>
            <Check size={17} />
            Sample school meeting recorded
          </li>
          <li>
            <Check size={17} />
            Sample academic grade reviewed
          </li>
          <li>
            <Check size={17} />
            Sample safeguarding walkthrough complete
          </li>
        </ul>
        <Button
          className="full-width"
          onClick={() => {
            if (detail) approve(detail);
            setDetail(null);
            toast("Training review complete. No real tutor was verified.");
          }}
        >
          Complete fictional review
          <Check size={16} />
        </Button>
      </Modal>
    </div>
  );
}
export function Admin() {
  const { completed, data } = useStore();
  function exportReport() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            scope: "fictional demo, current browser",
            sessionsThisVisit: completed.length,
            completedCheckpoints: lessons.filter(
              (l) => data.progress[l.id] === 100,
            ).length,
            curriculumNotes: lessons.length,
            liveServicesConnected: 0,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "village-vidya-demo-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="workspace-page">
      <div className="page-heading dashboard-heading">
        <div>
          <Eyebrow>A CLEAR VIEW OF WHAT’S CONNECTED</Eyebrow>
          <h1>
            Thoughtful systems.
            <br />
            <em>Stronger learning.</em>
          </h1>
          <p>Demo participation and an honest view of service readiness.</p>
        </div>
        <Button variant="outline" onClick={exportReport}>
          <Download size={16} />
          Export demo report
        </Button>
      </div>
      <div className="admin-stats">
        <div>
          <span>Practice sessions this visit</span>
          <strong>{completed.length}</strong>
        </div>
        <div>
          <span>Original reading notes</span>
          <strong>{lessons.length}</strong>
        </div>
        <div>
          <span>Live services connected</span>
          <strong>0</strong>
        </div>
      </div>
      <section id="operations" tabIndex={-1} className="trust-panel">
        <div className="section-heading">
          <h2>
            A little clarity on <em>the infrastructure.</em>
          </h2>
          <Server size={23} />
        </div>
        <div className="service-list">
          {[
            {
              name: "Demo matching & evaluation formulas",
              status: "Local calculations work",
              icon: RefreshCw,
            },
            {
              name: "Curriculum vector repository",
              status: "Not connected · original notes only",
              icon: Database,
            },
            {
              name: "SMS consent & weekly digest delivery",
              status: "Not connected · preview only",
              icon: MessageCircle,
            },
            {
              name: "AI Co-Teacher & grounded RAG",
              status: "Not connected · curated samples",
              icon: SparklesIcon,
            },
            {
              name: "Realtime messaging & encrypted transcripts",
              status: "Not connected · memory-only practice",
              icon: LockKeyhole,
            },
          ].map(({ name, status, icon: Icon }) => (
            <div key={name}>
              <Icon size={20} />
              <strong>{name}</strong>
              <span>{status}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="admin-note">
        <FileText size={22} />
        <p>
          No district participation totals, risk labels, or health metrics are
          fabricated. Production analytics and curriculum administration require
          a secure backend.
        </p>
      </div>
    </div>
  );
}
function SparklesIcon() {
  return <span className="blue-text">✳</span>;
}
export function Settings() {
  const { data, setPreferences, reset, online, role } = useStore();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="workspace-page settings-page">
      <div className="page-heading">
        <Eyebrow>A SPACE THAT FEELS LIKE YOURS</Eyebrow>
        <h1>
          The little <em>preferences.</em>
        </h1>
        <p>Simple choices for a calmer learning experience.</p>
      </div>
      <section className="settings-section">
        <div>
          <Globe2 size={22} />
          <h2>Learning language</h2>
          <p>
            Greeting and workspace navigation use your choice. Lesson
            translation is planned.
          </p>
        </div>
        <label className="field">
          <span className="sr-only">Choose learning language</span>
          <select
            value={data.language}
            onChange={(e) =>
              setPreferences({ language: e.target.value as Language })
            }
          >
            {["English", "हिन्दी", "मराठी", "తెలుగు"].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </section>
      <section className="settings-section">
        <div>
          <Wifi size={22} />
          <h2>Keep it light</h2>
          <p>
            Text-first learning with optional entrance animations switched off.
          </p>
        </div>
        <label className="availability-toggle">
          <input
            type="checkbox"
            role="switch"
            checked={data.lowData}
            onChange={(e) => setPreferences({ lowData: e.target.checked })}
          />
          <span className="switch-track" />
          <span>
            {data.lowData ? "Light mode on" : "Entrance animations allowed"}
          </span>
        </label>
      </section>
      <section className="settings-section">
        <div>
          <BookOpen size={22} />
          <h2>On this device</h2>
          <p>
            {data.saved.length} saved lessons.{" "}
            {online ? "You’re online." : "You’re offline."} Progress and
            bookmarks stay in this browser; server sync is not connected.
          </p>
        </div>
        <ButtonLink to="/explore" variant="outline">
          Open my library
          <ArrowUpRight size={15} />
        </ButtonLink>
      </section>
      <section className="settings-section">
        <div>
          <ShieldCheck size={22} />
          <h2>Your demo profile</h2>
          <p>
            Role: {role}. Fictional account only. No phone number, exact
            address, or identity document is collected.
          </p>
        </div>
        <ButtonLink to="/login" variant="outline">
          Try a different role
          <ArrowUpRight size={15} />
        </ButtonLink>
      </section>
      <section className="settings-section">
        <div>
          <RefreshCw size={22} />
          <h2>A fresh start</h2>
          <p>
            Reset local progress, saved lessons, sample approvals, and this
            visit’s session records.
          </p>
        </div>
        <Button variant="outline" onClick={() => setConfirm(true)}>
          Reset demo data
        </Button>
      </section>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Start a fresh little chapter?"
      >
        <p className="muted">
          This resets fictional demo progress and bookmarks on this device. The
          original sample state is restored.
        </p>
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setConfirm(false)}>
            Keep my progress
          </Button>
          <Button
            onClick={() => {
              reset();
              setConfirm(false);
            }}
          >
            Reset fictional demo
          </Button>
        </div>
      </Modal>
    </div>
  );
}
export function About() {
  return (
    <div className="container page about-page">
      <div className="page-heading">
        <Eyebrow>AN EVERYDAY IDEA. A THOUGHTFUL BEGINNING.</Eyebrow>
        <h1>
          Where you live
          <br />
          shouldn’t limit
          <br />
          <em>what you can learn.</em>
        </h1>
        <p>
          Village Vidya explores a simple belief: someone a little ahead can
          help someone take their next step.
        </p>
      </div>
      <div className="about-body">
        <section>
          <Eyebrow>THE IDEA AT THE HEART OF IT</Eyebrow>
          <h2>
            A village full of <em>possibility.</em>
          </h2>
          <p>
            Older students already help younger neighbours make sense of
            schoolwork. This project gives that familiar act a little structure:
            explainable matching, a calm lesson space, a one-tap way to ask for
            another explanation, and useful feedback for the tutor.
          </p>
          <p>
            Designed for rural and semi-urban Indian learners, the experience
            prioritizes shared languages, lightweight reading, and a human
            connection over expensive video and paid tutoring.
          </p>
        </section>
        <section id="safety">
          <Eyebrow>TRUST BEFORE GROWTH</Eyebrow>
          <h2>
            Care is part of <em>the design.</em>
          </h2>
          <p>
            Real registration is closed. Every profile, verification status, and
            teaching report in this release is fictional. We do not collect real
            children’s contact details or identity documents.
          </p>
          <p>
            Before a real pilot, production must implement verifiable guardian
            consent, physical Local Champion verification, encrypted storage,
            secure role authorization, multilingual moderation, and an
            accountable escalation process. The local contact filter is a small
            demonstration safeguard.
          </p>
          <div className="safety-principles">
            <span>
              <ShieldCheck size={20} />
              Consent before activation
            </span>
            <span>
              <Users size={20} />
              Verification before matching
            </span>
            <span>
              <LockKeyhole size={20} />
              Private by design
            </span>
          </div>
        </section>
        <section>
          <Eyebrow>AN HONEST FIRST RELEASE</Eyebrow>
          <h2>
            What you can <em>try today.</em>
          </h2>
          <div className="implementation-table">
            <div>
              <strong>Working locally</strong>
              <p>
                Weighted tutor ranking, eligibility rules, lesson checkpoints,
                mastery, bookmarks, ELIC timeline events, private session notes,
                and calculated teaching-score formulas.
              </p>
            </div>
            <div>
              <strong>Clearly simulated</strong>
              <p>
                Fictional profiles, tutor acceptance, curated tutoring replies,
                sample Co-Teacher evaluation, guardian digest previews, and
                Champion training reviews.
              </p>
            </div>
            <div>
              <strong>Requires production services</strong>
              <p>
                Real authentication and consent, multi-device realtime chat,
                audio, official curriculum retrieval, live AI, SMS, server
                moderation, and delta synchronization.
              </p>
            </div>
          </div>
        </section>
        <section>
          <Eyebrow>MADE TO BE UNDERSTOOD</Eyebrow>
          <h2>
            A college project,
            <br />
            <em>with care in every detail.</em>
          </h2>
          <p>
            Village Vidya is built for Software Engineering at MIT Academy of
            Engineering, Pune. Its Software Requirements Specification is the
            baseline for the matching algorithm, five-dimension evaluation,
            teaching ladder, and child-safety requirements.
          </p>
          <p>
            CampusPass inspired the typographic confidence, warm canvas, and
            clear navigation. Village Vidya gives those principles a
            learning-focused identity of its own.
          </p>
          <Link className="text-link" to="/login">
            Explore the fictional experience
            <ArrowUpRight size={17} />
          </Link>
        </section>
      </div>
    </div>
  );
}
