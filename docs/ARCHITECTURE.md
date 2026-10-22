# Architecture and deployment gates

## Current release

The deployed application is a static React demonstration. It contains no server secrets and cannot register a real person. `StoreProvider` is the single local data-access boundary. Zod validates persisted preference/progress data; malformed or obsolete storage resets to known fictional defaults. Only preferences, mastery, bookmark IDs, sample review IDs and a practice-goal flag are persisted. A fictional role and expiry are stored in session storage.

Messages, notes, questions, match requests and session summaries are held in memory. Role selection is an explicit demo mechanism. A user can change the role in the UI; no claim of secure authentication is made.

Presentation → features → domain rules → demo repository is the dependency direction. Components do not reimplement CMS or TSS formulas. Tutor availability and completed sample evaluations are derived into the catalog so the Studio and discovery stay consistent during a visit.

## Relationship to the SRS five tiers

| SRS tier | This release | Production work |
| --- | --- | --- |
| Presentation | React/TypeScript SPA, self-hosted fonts, static offline cache | Android native client and tested low-memory browser support |
| API gateway | No privileged client operations or external requests | TLS 1.3, 100 req/min rate limit, authorization, secure cookies and moderation |
| Core services | Pure matching, eligibility, request/session state, rubric and progress calculations | Atomic availability locks, durable session orchestration, consent and notifications |
| AI pipeline | Curated originals, labelled sample evaluation, coverage fallback | 768-dimension curriculum index, retrieval, grounded evaluation, translation |
| Persistence | Validated fictional preferences in local storage; memory-only transcripts | PostgreSQL, encrypted private records, Redis locks/queues, Qdrant |

This is a pragmatic vertical slice, not an implementation of the SRS microservice cluster. The relational backend remains deferred. No Redis, vector database, queue, gateway, or production auth server is represented as running.

## Rules that are active locally

- Grade boundary: tutor verified grade must be at least the requested grade.
- Verification and TSS floor: verified flag and TSS ≥ 50 are mandatory before ranking. Schedule availability affects CMS; an offline eligible tutor may be scheduled but cannot receive an immediate request.
- CMS inputs: subject and language are binary membership, TSS is clamped to 0–100 then normalized, availability is binary. The SRS does not specify richer proficiency scales; this interpretation is explicit.
- Invitation expires at 45 seconds; the open matcher cascades through untried available candidates, capped at 90 seconds. Closing a pending matcher cancels that attempt. No distributed locking is claimed.
- Terminal sessions cannot reopen. The reconnection exercise lasts 180 seconds and disables messaging. It is a local simulation, not transport restoration.
- Co-Teacher sample: 30/25/20/15/10 dimension weights. TSS updates by `0.85 old + 0.15 session score`. Session scores are predefined, not inferred from conversations.
- Ladder: Helper 50, Explainer 70, Mentor 82, Village Guide 90. The SRS’s **example** 25-session Mentor qualification is adopted conservatively. It supplies no other session-count thresholds; none are invented. Three consecutive coaching sessions below a current tier’s score are allowed before demotion on the following assessment. The TSS 50 matching floor always applies, regardless of grace.
- Mastery: a correct one-question checkpoint awards 100% for that original demo topic; an incorrect attempt retains the previous best value. This is a simple demo mastery model, not a validated proficiency assessment.

## Before production registration can open

1. Run a secure backend. Authentication needs cryptographic six-digit OTPs with ten-minute validity, rate limits, replay prevention, and non-enumerating responses. The SRS also specifies Argon2id password hashing and 15-minute JWTs with rotating HttpOnly refresh cookies. Resolve the OTP/password UX before selecting the auth provider.
2. Create server-owned roles. A client may never promote itself, alter verified grade, consent state, TSS, or moderation status.
3. Implement a verified guardian relationship and immutable consent audit, plus real Local Champion physical sign-off. Do not infer consent from a checkbox or automatically mark a user verified.
4. Run all messages through a server safety boundary before persistence and delivery. Add language-aware PII/address redaction, audio moderation, severe-event termination, account freezing, and accountable Champion/admin escalation. The current local regex is insufficient.
5. Verify encryption at rest for profiles, consent and transcripts, secure key management, TLS, retention/deletion rules, and least-privilege operations. A relational schema alone cannot provide AES-256 storage encryption.
6. Implement a curriculum ingestion pipeline with 300–500-token chunks, 50-token overlap, 768-dimensional vectors and grade/subject/chapter/objective metadata. Record actual source spans. Retrieval acceptance uses >0.78; <0.65 routes to humans. Treat the unspecified intermediate confidence range conservatively by withholding a verified answer until clarified.
7. Add authenticated WebSocket messaging, Redis locking and durable queues; implement WebRTC Opus 12 kbps only after safety and bandwidth testing.
8. Connect signed SMS callbacks, Sunday 18:00 IST localized digests, the 60-second push fallback, and at most two non-critical alerts per day. Unicode SMS encoding/provider segments need explicit verification.
9. Replace local storage with an approved persistence model for real users. Cache only non-sensitive curriculum under 50 MB. Implement server-authoritative timestamp conflict resolution and test FIFO IndexedDB delta replay.

No production integration should be enabled by a frontend environment switch. A future server adapter must deny operations when trust services are unavailable. Do not collect real minors’ information while those gates are incomplete.

## Offline scope

The production build enumerates only static HTML, JS, CSS, SVG and fonts. A versioned service worker caches those files; it never caches `/api` or third-party requests. The build fails if the cache exceeds 50 MB. A failed install does not prevent ordinary online usage. Static navigation uses the network first and falls back to the cached app shell. There is no pending server-action queue or bidirectional sync.

The worker is enabled only in production, on HTTPS or localhost. A first successful online production load is required. Cache lifetime is versioned; activation deletes only old Village Vidya static caches, not unrelated origin storage. Development builds deliberately skip registration.

## Future backend boundary

No migration is included or applied. A future audited server must own writes to scores, consent, verification, match assignment and moderated messages. Its authorization policies must limit private reads to owners/participants and authorized governance roles. Frontend demo route gates cannot substitute for those policies.

## Workspace route boundary (Phase 2)

`AppRoutes` composes public, shared-discovery and protected workspace routes. `Workspace` owns internal chrome; `workspace-navigation.ts` shares role destinations between desktop and mobile. `WorkspaceContent` applies route focus after lazy content is ready. Demo state stays above both layout trees. Existing URL and role permissions are preserved; see [PHASE-2.md](PHASE-2.md).
