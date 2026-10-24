# SRS traceability

Baseline: supplied `202401100138_SAD_A1.pdf`, 25 physical pages, read in full. The original file is unchanged and is not redistributed in the source repository. Some printed table-of-contents page numbers exceed the actual PDF length; this mapping uses section and requirement IDs.

**Local** = implemented calculation or browser interaction. **Sample** = explicitly fictional demonstration. **Deferred** = no production implementation. A sample is not counted as a completed live service requirement.

| SRS section / IDs | Priority | Delivered evidence | Remaining production requirement |
| --- | --- | --- | --- |
| 4.1 AUTH-1, AUTH-3 | High | Sample: five roles; UI gates; 15-minute fictional session; Zod preference validation | Cryptographic OTP, 10-minute validity, Argon2id, JWT issuance, cookie refresh and server auth are deferred |
| 4.1 AUTH-2 | High | Real registration is closed; no real minor can be activated. Guardian acknowledgement is labelled sample | Verifiable guardian consent and secure audit trail |
| 4.2 MATCH-1 | High | Local: exact weighted CMS, input normalization, rank, factor explanations in `domain/learning.ts` and tutor profiles | Real availability/proficiency data |
| 4.2 MATCH-2 | High | Single-browser state only; no cross-client concurrency claim | Redis distributed tutor locks |
| 4.2 MATCH-3 | High | Local: 45-second invitations, decline/expiry cascade, 90-second cap and curated assistant fallback | Durable orchestration and actual human notification |
| 4.3 SESS-1 | High | Text-first local room explicitly says audio is not connected | WebRTC, TURN and Opus 12 kbps |
| 4.3 SESS-2 | High | Local: ELIC records `Date.now()` timestamp, timeline event, tutor nudge and simpler sample reply | WSS event delivery to real tutor |
| 4.3 SESS-3 | High | Local: 180-second reconnection exercise, message lock, restore or termination | Real transport drop handling, durable encrypted transcript recovery |
| 4.4 CURR-1, CURR-2 | High | Original topic records with grade and subject; service readiness shows no official vector index | Official documents, semantic chunking with 50-token overlap, 768-dim index, chapter/objective metadata |
| 4.5 COTEACH-1, COTEACH-2 | High | Local: exact five-weight rubric and EMA calculations; sample reports and per-visit sample history | Grounded transcript evaluation and durable score updates |
| 4.5 COTEACH-3 | High | Sample actionable coaching and a practice goal | Native-language generated tips within 45s; no latency claim |
| 4.6 DOUBT-1 | Medium | Curated originals identify their provenance; unsupported questions receive no invented answer | Actual NCERT-grounded retrieval/LLM pipeline and citations |
| 4.6 DOUBT-2 | Medium | Coverage-based peer-help fallback; no fake similarity score | <0.65 vector-similarity fallback and scheduled human queue |
| 4.7 TRANS-1, TRANS-2 | High | Local handwritten greetings/navigation and shared-language matching in four languages | Real-time bidirectional translation, original-script toggle, Redis terminology cache and translation latency |
| 4.8 GROWTH-1 | Medium | Local score thresholds, sample ladder; conservative ≥25-session Mentor qualification | Production promotion review and other qualification clarification |
| 4.8 GROWTH-2 | Medium | Three-session grace calculation tested; matching floor remains immediate | Durable coaching history and Champion-approved promotions |
| 4.9 WALL-1 | Low | Authored sample cards only; separate fictional Champion training review. No user card auto-publication | Real Champion approval gate for extracted transcript cards |
| 4.9 WALL-2 | Low | Samples contain no student identifiers; conversations are not transformed into public cards | Robust PII stripping and anonymized card generation |
| 4.10 PROG-1 | Medium | Local 0–100 mastery from checkpoints, persisted demo progress and next-topic recommendation | Validated multi-question mastery model |
| 4.10 PROG-2 | Medium | Local JSON participation export labelled current-browser demo | Aggregate district monthly reports, secure analytics and >10-day dropout scanner |
| 4.11 PARENT-1, PARENT-2 | High | Sample localized digest built from per-visit sessions/checkpoints, max 140 characters; no send button | Sunday 18:00 IST scheduler, provider delivery, callback receipts, native encoding checks |
| 4.12 CHAMP-1 | High | Unverified profiles fail local eligibility; real registration remains closed; fictional training reviews do not unlock real accounts | Physical sign-off tokens and secure Champion authority |
| 4.12 CHAMP-2 | High | Dedicated training dashboard clearly discloses no live alert queue | Live escalation queue and audit workflow |
| 4.13 NOTIF-1, NOTIF-2 | High | In-app local notification only | FCM/push, 60-second SMS fallback, daily non-critical throttle |
| 4.14 SYNC-1 | Medium | Local production static reading cache, build-enforced <50 MB budget, browser bookmarks | IndexedDB content eviction, full content lifecycle and offline action queue |
| 4.14 SYNC-2 | Medium | No sync claim; local state clearly labelled on-device | Server-authoritative delta synchronization, conflict tests |
| 4.15 SEC-1 | High | Local regex redacts common phone/email/URL patterns before display; notes/messages never persisted | Real-time multilingual phone/address/social-link moderation |
| 4.15 SEC-2 | High | No persistent transcript store exists; no encryption claim | AES-256 encrypted transcript storage and key lifecycle |

## Nonfunctional and business requirements

- BR-01/02: grade boundary and TSS ≥50 enforced and tested. BR-03: no fees, payments or compensation features.
- Security/safety: no real child details collected; UI exposes first names and grades only. Real OTP, TLS policy validation, AES-256, refresh rotation, language-aware severe-event handling, and production authorization remain deployment gates.
- Performance targets (5s matching P95, 300ms 3G messaging, 45s analysis, 150 KB text/2.7 MB audio session) are not claimed. There is no real networked tutoring transport or AI worker to benchmark.
- Bundle/cache budgets are measured in the production build. No claim is made about 35 MB device memory, 99.5% uptime, Android 7–15 certification, or SUS ≥80 without appropriate field tests.
- Accessibility: semantic controls, keyboard navigation, native focus-trapped dialogs, labelled inputs, live regions, responsive composition and reduced-motion support. A screen-reader/low-literacy field audit remains planned; some compact metadata is intentionally smaller than body copy.

## Additions and deliberate deviations

1. Explainable matching exposes all four factors instead of only a rank. No eligibility rule is weakened.
2. Original daily-life examples, checkpoints and a deterministic next-topic recommendation make learning testable without an LLM. They are not represented as official NCERT retrieval.
3. Temporary session notes and meaningful post-session actions support actual learning. Notes are device-local, not collaborative across peers.
4. Tutor coaching goals reward a useful teaching practice rather than repeated logins. No competitive student leaderboard is added.
5. Guardian/Champion/admin training views are present, but real governance remains server-only. No mock approval silently becomes real consent or verification.
6. Static React + a relational foundation replaces the proposed multi-service deployment for this increment. FastAPI/native Android/Redis/Qdrant are deferred explicitly.
7. No external stock photography, heavy video, paid services or analytics are introduced.
8. The SRS gives no comprehensive session-count rules beyond its Mentor example; the implementation documents the chosen interpretation rather than inventing hidden requirements.

## Phase 4 academic refinement

CURR-1/2 now have a typed Board → Grade → Subject → Chapter → Lesson → Assessment local catalog, explicit edition-specific reference metadata and coverage gaps. Learner Grades 4–10 and all four context dimensions constrain discovery and recommendations. PROG-1 counts/checkpoints are scoped consistently without discarding legacy records. DOUBT-1’s curated explanations use that same context; this does not satisfy live grounded retrieval. MATCH-1 retains tutor academic eligibility and snapshots requested learner context through cascade/rooms. Official ingestion, semantic/vector retrieval, translations and persistence remain deferred. See [PHASE-4.md](PHASE-4.md) for grade-wise coverage, source verification and the four-state inventory.

## Phase 5 persistence and authorization foundation

AUTH/CURR/PROG/PARENT/CHAMP now have normalized Supabase Auth UUID relationships, stable academic IDs, explicit grants, RLS, source provenance and append-only trust/attempt histories. Real PostgreSQL tests use anon/authenticated/service-role contexts, including denial checks. Native tests use a minimal auth-schema fixture; CI runs the same suites on Supabase's real local database/auth schema. The fictional UI is unchanged. Registration, authenticated UI persistence, verified physical evidence, trusted scoring/consent services, messaging and cross-device migration remain unimplemented. See [DATABASE.md](DATABASE.md).
