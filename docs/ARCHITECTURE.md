# Architecture and deployment gates

## Current release

The React application has two independent workspaces. The default fictional demo uses `StoreProvider`, validated local preferences/progress and in-memory conversations, matching and session simulations. Its role picker is a demo mechanism; sample scores and verification never transfer to real accounts.

When explicitly configured for Supabase, `AccountProvider` shares one public-key client with typed repositories and resolves identity and roles from Auth and PostgreSQL. Only provisioned adult test accounts with live, enabled sessions enter private routes. Phase 7 connects learner enrolment, saved lessons and self-reported reading. Phase 8 connects tutor biographies, private weekly availability, trusted qualifications and ordered verification history. Public registration, real children, matching, bookings and live sessions remain closed.

Presentation → feature hooks → typed repositories → Supabase Auth/PostgREST → PostgreSQL is the authenticated data path. The demo path continues through domain rules and its local repository. No service credential is present in the browser.

## Relationship to the SRS five tiers

| SRS tier | This release | Production work |
| --- | --- | --- |
| Presentation | React/TypeScript SPA, self-hosted fonts, static offline cache | Android native client and tested low-memory browser support |
| API gateway | Supabase Auth/PostgREST for adult test accounts; no privileged client credentials | TLS 1.3, 100 req/min rate limit, authorization, secure cookies and moderation |
| Core services | Persistent learner/tutor RPCs; fictional matching/session/rubric simulations | Atomic availability locks, durable session orchestration, consent and notifications |
| AI pipeline | Curated originals, labelled sample evaluation, coverage fallback | 768-dimension curriculum index, retrieval, grounded evaluation, translation |
| Persistence | PostgreSQL/RLS for adult test records; separate local fictional preferences | Verified deployment/encryption/retention, Redis locks/queues, Qdrant |

This is a pragmatic vertical slice, not an implementation of the SRS microservice cluster. The authenticated learner and tutor UI uses the versioned Supabase PostgreSQL/RLS schema. No Redis, vector database, queue, gateway, or production auth server is represented as running.

## Rules active in the fictional demo

- Grade boundary: tutor verified grade must be at least the requested grade.
- Verification and TSS floor: verified flag and TSS ≥ 50 are mandatory before ranking. Schedule availability affects CMS; an offline eligible tutor may be scheduled but cannot receive an immediate request.
- CMS inputs: subject and language are binary membership, TSS is clamped to 0–100 then normalized, availability is binary. The SRS does not specify richer proficiency scales; this interpretation is explicit.
- Invitation expires at 45 seconds; the open matcher cascades through untried available candidates, capped at 90 seconds. Closing a pending matcher cancels that attempt. No distributed locking is claimed.
- Terminal sessions cannot reopen. The reconnection exercise lasts 180 seconds and disables messaging. It is a local simulation, not transport restoration.
- Co-Teacher sample: 30/25/20/15/10 dimension weights. TSS updates by `0.85 old + 0.15 session score`. Session scores are predefined, not inferred from conversations.
- Ladder: Helper 50, Explainer 70, Mentor 82, Village Guide 90. The SRS’s **example** 25-session Mentor qualification is adopted conservatively. It supplies no other session-count thresholds; none are invented. Three consecutive coaching sessions below a current tier’s score are allowed before demotion on the following assessment. The TSS 50 matching floor always applies, regardless of grace.
- Mastery: a correct one-question checkpoint awards 100% for that original demo topic; an incorrect attempt retains the previous best value. This is a simple demo mastery model, not a validated proficiency assessment.

## Before production registration can open

1. Validate production authentication and operations beyond the adult test release. The SRS calls for cryptographic six-digit OTPs with ten-minute validity, rate limits, replay prevention, and non-enumerating responses. The SRS also specifies Argon2id password hashing and 15-minute JWTs with rotating HttpOnly refresh cookies. Reconcile the production OTP/password and cookie requirements with the current Supabase adult test flow.
2. Maintain existing server-owned roles and add audited privileged workflows. A client may never promote itself, alter verified grade, consent state, TSS, or moderation status.
3. Implement a verified guardian relationship and immutable consent audit, plus real Local Champion physical sign-off. Do not infer consent from a checkbox or automatically mark a user verified.
4. Run all messages through a server safety boundary before persistence and delivery. Add language-aware PII/address redaction, audio moderation, severe-event termination, account freezing, and accountable Champion/admin escalation. The current local regex is insufficient.
5. Verify encryption at rest for profiles, consent and transcripts, secure key management, TLS, retention/deletion rules, and least-privilege operations. A relational schema alone cannot provide AES-256 storage encryption.
6. Implement a curriculum ingestion pipeline with 300–500-token chunks, 50-token overlap, 768-dimensional vectors and grade/subject/chapter/objective metadata. Record actual source spans. Retrieval acceptance uses >0.78; <0.65 routes to humans. Treat the unspecified intermediate confidence range conservatively by withholding a verified answer until clarified.
7. Add authenticated WebSocket messaging, Redis locking and durable queues; implement WebRTC Opus 12 kbps only after safety and bandwidth testing.
8. Connect signed SMS callbacks, Sunday 18:00 IST localized digests, the 60-second push fallback, and at most two non-critical alerts per day. Unicode SMS encoding/provider segments need explicit verification.
9. Extend the existing PostgreSQL persistence model for production users; private account records already bypass demo local storage. Cache only non-sensitive curriculum under 50 MB. Implement server-authoritative timestamp conflict resolution and test FIFO IndexedDB delta replay.

No production integration should be enabled by a frontend environment switch. A future server adapter must deny operations when trust services are unavailable. Do not collect real minors’ information while those gates are incomplete.

## Offline scope

The production build enumerates only static HTML, JS, CSS, SVG and fonts. A versioned service worker caches those files; it never caches `/api` or third-party requests. The build fails if the cache exceeds 50 MB. A failed install does not prevent ordinary online usage. Static navigation uses the network first and falls back to the cached app shell. There is no pending server-action queue or bidirectional sync.

The worker is enabled only in production, on HTTPS or localhost. A first successful online production load is required. Cache lifetime is versioned; activation deletes only old Village Vidya static caches, not unrelated origin storage. Development builds deliberately skip registration.

## Authenticated data boundary

Phase 5 adds versioned migrations, explicit SQL grants, ownership-scoped RLS and typed repositories. Scores, roles, consent, verification and curriculum writes remain trusted-service operations. Phase 6 adds `AccountProvider` with one authenticated client, server-validated identity and database-assigned roles. Account routes never mount fictional feature components; their repositories cannot import browser progress. Restrictive live-session/adult-test policies intersect existing ownership checks. Default demo mode still uses its original adapter; frontend gates cannot substitute for database policies. See [DATABASE.md](DATABASE.md) for setup, the access matrix and production gates.

## Workspace route boundary (Phase 2)

`AppRoutes` composes public, shared-discovery and protected workspace routes. `Workspace` owns internal chrome; `workspace-navigation.ts` shares role destinations between desktop and mobile. `WorkspaceContent` applies route focus after lazy content is ready. Demo state stays above both layout trees. Existing URL and role permissions are preserved; see [PHASE-2.md](PHASE-2.md).

## Dashboard state boundary (Phase 3)

`role-dashboards.tsx` composes learner/tutor content with scoped CSS. `domain/dashboard.ts` selects unfinished lessons, open requests and known future IST demo slot labels. `StoreProvider.learningActivity` holds up to 30 checkpoint metadata events in memory; saved progress still uses its existing validated schema. Logout, reset and demo expiry clear visit records. The overview reads the same derived tutor catalog as discovery. Stopped requests are cancelled locally so dashboard recommendations cannot reopen safety-stopped rooms. See [PHASE-3.md](PHASE-3.md).

## Academic context boundary (Phase 4)

`domain/curriculum.ts` owns learner Grades 4–10 and academic context validation. `data/curriculum.ts` supplies the local catalog through a typed repository contract, with board/grade/subject/chapter foreign keys and separate lesson/assessment records. Shared filters drive discovery, recommendations, saved counts, progress and curated AI. Tutor grades stay separate. Request snapshots retain the learner context and eligible lesson through cascading and practice rooms. Legacy preferences default to the original CBSE sample; invalid old learner grades normalize to 8 without discarding valid checkpoint/bookmark data. This paragraph describes the fictional demo adapter; authenticated accounts now load the published database catalog. See [PHASE-4.md](PHASE-4.md) for coverage, provenance, migration and limitations.

## Persistent tutor workspace (Phase 8)

`AccountWorkspace` mounts `TutorWorkspace` only for authenticated tutor routes `/studio`, `/settings` and `/studio/feedback`. The account-keyed component and hook invalidate obsolete responses on unmount/account change, serialize UI writes, refresh on focus/online/manual retry, and display confirmed server state. Background session checks keep the current editor mounted while revalidating the same identity; failed/revoked access and account changes still clear it. Failed writes keep drafts until refreshed; refreshing changed records resets their editors. The landing page, all five role destinations and fictional demo components remain independent.

The tutor repository validates Auth identity and pins every request to that session token. Biography and availability RPCs accept no owner ID; they enforce the live adult tutor gate and optimistic integer revisions. The database serializes schedule counts per tutor and uses a GiST exclusion constraint to reject overlaps even across competing writes. Availability is fixed to Asia/Kolkata and has 15-minute–4-hour minute-aligned intervals, at most four per day/28 per week. Adjacent intervals are valid; disabled intervals must also remain non-overlapping. `enabled` records a personal preference and never enables discovery or booking.

Subject/language qualifications, academic grade, verification, TSS and completed-session counts remain trusted writes. Verification is append-only, latest `event_number` first; even an approved test record is not actual physical verification. Preparation indicators count only a stored biography and saved intervals. Feedback displays genuine aggregate values or an empty state because detailed evaluation/session tables do not exist. No public tutor discovery API or bookability flag is introduced.
