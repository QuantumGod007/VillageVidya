# Village Vidya

A free peer-learning concept for rural and semi-urban Indian learners. The first release is an interactive **fictional local demonstration**, built against the supplied Village Vidya SRS. It is not open for real student registration.

The design takes CampusPass’s warm canvas, editorial typography, and restrained cobalt as a reference, with original learning illustrations and workflows. Assets and fonts are bundled locally; the app does not request external images, analytics, or AI services.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. To test the production build and offline reading:

```sh
npm run build
npm run preview
```

No environment variables, API keys, or paid services are required for the fictional demo. For real Supabase sign-in with a provisioned adult test account, follow [local authentication setup](docs/DATABASE.md#local-supabase). Never place service-role or AI keys in `VITE_*` variables.

## Try a connected journey

1. Choose **Get started** and the fictional **Learner** role. Select **CBSE**, **Grade 6**, **English**, and **Mathematics** for this fractions journey. Acknowledge that the profile is fictional.
2. Continue **Fractions, made familiar**. Answer its checkpoint; correct answers update actual local mastery. Bookmark the lesson and find it in Saved lessons.
3. Open **Find tutors**. Change language/grade/availability filters and inspect **Why this match makes sense**.
4. Request a demo session. Explicitly simulate acceptance, decline, or timeout. Declines cascade to another eligible available peer; unanswered invitations expire after 45 seconds, with an overall 90-second limit.
5. Enter the **local practice room**. Send a message, use **ELIC**, write a temporary note, practise a connection drop, and finish with a rating. Tutor replies are prewritten examples.
6. Return to **My sessions** or the dashboard. The session metadata is reflected during this visit.
7. Preferences → **Try a different role** preserves this visit’s records. Explore Aditi’s Tutor Studio, sample Co-Teacher report, Kavita’s digest preview, Anita’s training reviews, and Dev’s local participation export.

Leaving the demo signs out and discards visit-only session records. Reloading discards messages, notes, questions, match requests, and session metadata. There is no cross-tab/device synchronization.

## What works

- Responsive landing page with an interactive fraction illustration, ELIC preview, language greetings, and FAQ.
- Five fictional roles, preference validation, a 15-minute demo session, and role-specific route gates. These gates are UI behaviour, **not production authorization**.
- Tutor eligibility and CMS calculation: `0.35 × Subject + 0.30 × Language + 0.20 × TSS_normalized + 0.15 × Availability`.
- Match requests, acceptance/decline/expiration, fallback, illustrative IST scheduling, and cancellation.
- Memory-only practice conversation, millisecond ELIC events, local contact redaction, three-minute reconnection exercise, ratings, and summary.
- Eight authored reading notes with scored checkpoints, saved reading, and progress/recommendations filtered by board, learner grade (4–10), subject, and language. See [grade-wise catalog coverage](docs/PHASE-4.md#catalog-coverage) for available samples and gaps.
- Curated Doubt Assistant explanations with explicit source provenance and a peer-help fallback for uncovered questions.
- Sample Co-Teacher dimensions with **calculated** weighted score and TSS EMA; tutor availability, a practice goal, session history, and ladder rules.
- Guardian digest formatting, Champion training review state, original community cards, and a downloadable local demo report.
- Production service worker caches the static app and reading assets below a checked 50 MB limit. Bookmarks/progress persist locally; there is no server delta sync. Development mode does not install the worker.
- Handwritten greetings/navigation in English, Hindi, Marathi, and Telugu. Lesson translation and speech are not implemented.

## Honest service boundaries

No real OTP, consent, physical verification, automated safety escalation, SMS delivery, curriculum embeddings, LLM analysis, live translation, WebSocket chat, WebRTC audio, or encrypted transcript database is connected. All profile verification badges are labelled fictional. No real registration form collects a child’s personal information.

Local regex contact removal catches common phone numbers, email addresses, and web links. It is not full multilingual moderation, address detection, or production child protection. User-entered messages/questions/notes are never written to persistent browser storage.

The Supabase PostgreSQL/RLS foundation now supports genuine sign-in, session refresh/recovery/sign-out and server-assigned roles for provisioned adult testers. Default demo mode remains separate; private account data requires a live Auth session and trusted test-access grant. Provisioned adult testers can also send persistent tutor requests, reserve non-overlapping intervals after independent tutor acceptance, and maintain shared session activity records. Real learner registration and tutoring remain closed. See [database setup, migrations and security](docs/DATABASE.md). Complete the security gates in [the architecture](docs/ARCHITECTURE.md) before any real pilot.

## Stack and structure

React 19, TypeScript, Vite, React Router, Tailwind CSS, Motion, Lucide, React Hook Form, Zod, Vitest, and Testing Library.

```text
src/components/    Shared design primitives, navigation, original SVG artwork
src/features/      Landing, onboarding, learning, matching, sessions, trust workflows
src/domain/        SRS formulas, eligibility, validation, state rules and types
src/data/          Fictional profiles and original educational notes
src/lib/           Validated local demo state and derived tutor catalog
tests/            Domain and interaction regression tests
scripts/          Build-time offline cache generation and budget check
docs/             Architecture, SRS traceability, design decisions and QA
```

The core workflow uses no remote assets. Feature screens are lazy-loaded. DM Sans and Instrument Serif are self-hosted via their Fontsource packages. Most visual work uses ordinary CSS; Tailwind is available without adding a large component framework.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm audit
```

Tests cover formula weights, eligibility, grade/TSS boundaries, ladder grace, account restrictions, validation, request expiry, session transitions, contact filtering, checkpoints, bookmarks, ELIC, reconnection, and navigation. See [QA notes](docs/QA.md) for the actual verification scope.

## Deployment

`vercel.json` configures the Vite build, SPA rewrites, and response security headers. Import this **project directory** into Vercel, select Vite, and use `npm run build` with `dist` as output. No backend secrets are required for this demo. For other static hosts, rewrite app navigation to `index.html` and serve `sw.js` without long-lived caching. The Sites hosting identity is in `.openai/hosting.json`.

## Requirements and next increments

Development now proceeds through sequential, meaningful PRs with human review before merging. See [the milestone plan](docs/DEVELOPMENT.md).

The supplied SRS is unchanged. [Traceability](docs/SRS-TRACEABILITY.md) records every functional requirement, the implementation level, and deferred work. Additions include explainable matching, curated learning journeys, privacy-preserving notes, and useful checkpoints. [Design notes](docs/DESIGN.md) explain the reference and original decisions.

Before a real pilot: deploy secure authentication/consent, implement server authorization and physical verification, connect curriculum-grounded AI with provenance, add moderated realtime communication, then test multilingual safety, SMS, offline conflicts, performance and usability with field partners. Do not activate real learners by simply replacing the fictional seed data.
