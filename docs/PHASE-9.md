# Phase 9: private adult-test tutor discovery

## Release boundary and workflow

This branch starts at main `3c27020ca730692769799c530c1096e3c4b5ba5e`, after Phase 8 PR #9 merged and its main workflow completed successfully. Authenticated learner `/tutors` now calls PostgreSQL for real matching records. The fictional demo, landing page, learner persistence and tutor workspace retain their separate adapters. No booking, invitations, session records, live messaging, AI or guardian registration are added.

This is an **adult-test matching preview**, not production discovery. All participants must be provisioned adults. A test approval is never physical verification. A tutor explicitly opts in from Settings; this preference defaults off, persists in PostgreSQL and is independent of both qualifications and weekly availability. Opting in alone cannot make an account eligible.

## Matching specification

The trusted database function applies these gates before ranking:

1. The candidate has an enabled adult test account, assigned tutor role, confirmed email and no current Auth ban. A current tutor sign-in is not required: a weekly preference is not online presence.
2. The tutor enabled the private adult-test preview and is not the querying learner's own account.
3. The latest verification event, ordered by authoritative `event_number`, is approved and has a recorded grade. Pending, missing, rejected or revoked latest events fail.
4. The requested learner grade is at most **both** the current server-assigned academic grade and latest approved test grade. This conservatively caps stale approval against the current provisioning record (SRS BR-01).
5. A trusted subject qualification exists for the **exact published subject ID**, including its board and grade. There is no inferred qualification for another board, lower grade or subject. The chosen subject and all academic ancestors must be published.
6. A trusted qualification exists for the exact selected language. This preview requires a shared qualified language rather than relying on an unimplemented translation service. The original fictional matching adapter is unchanged.
7. A genuinely stored TSS is at least 50 (SRS BR-02); null scores fail.

The SRS REQ-MATCH-1 weights remain `35% subject + 30% language + 20% TSS/100 + 15% preference compatibility`, on a 0–100 scale. Subject/language factors are one after the hard gates. No score is created or updated by discovery. Scores are ranked at full precision, then by stable opaque preview UUID ascending; presentation rounds to one decimal only.

Without a requested window, the preference factor checks the server's current Asia/Kolkata weekday/time, start inclusive and end exclusive. With a requested weekly window, one enabled saved interval must cover the **entire** window; disabled intervals and merely adjacent/partially overlapping intervals do not qualify. Windows use the Phase 8 same-day 15-minute–4-hour, minute-precision bounds. Otherwise qualified candidates remain visible with zero preference points unless the learner requests preference-only results. Saved preferences cannot confirm an appointment, actual presence, availability lock or reservation. Redis/session locking from the SRS remains future work because this phase creates no sessions.

## Trusted operations and privacy

`discover_test_tutors(subject_id, language, query, weekday?, starts_at?, ends_at?, preference_only)` accepts no learner/tutor owner ID, score, verification or eligibility declaration. Its fixed-search-path SECURITY DEFINER entry point requires a live enabled adult **learner** session. Anonymous, tutor-only, guardian, champion and app-admin calls fail. Public registration stays closed; service credentials stay outside browser code.

The RPC builds the candidate set, latest evidence, qualifications, preferences and rank in one MVCC query snapshot. Every new query re-evaluates committed changes. Uncommitted multi-record changes cannot produce a mixed decision. There is no durable match allocation and no promise that eligibility remains unchanged after a response.

Only ten candidate fields are disclosed: opaque `preview_id`, generated `label`, test `eligible` flag, effective `verified_grade`, stored `teaching_skill_score`, `cms`, four numeric `factors`, structured passed `reasons`, `has_weekly_preference`, and `preference_matches`. Auth UUIDs, names, biographies, email, exact private intervals, review notes, reviewers, event IDs and unrelated account records remain private. The pseudonym ID is independently generated, immutable to clients, unique and constrained to differ from the Auth user ID. Search is a literal case-insensitive substring of this generated label only, bounded to 64 characters. It never searches private identity or biography fields.

The response contains at most the best 24 candidates plus `more_available`; learners narrow context or ID search instead of paging through changing snapshots. The query overfetches one candidate to calculate that flag. No unbounded result set or inconsistent page cursor is exposed. The envelope includes test-only status, validated context, availability basis, authoritative check time and a 60-second expiry. UI results clear on search changes, reload/error/offline state and account change; focus/online/manual retry and expiry request a fresh result. They are not written to local storage, service-worker data caches or an offline queue. As with any read, a response describes its server snapshot; it cannot guarantee future eligibility.

`set_tutor_discovery_preview(enabled, revision)` reuses the live tutor guard and Phase 8 revision/locking approach. It cannot alter another tutor, assign an alias, approve qualifications, change TSS or make anyone bookable. Direct preference/pseudonym updates remain denied. All existing private-table RLS remains unchanged. The pure TypeScript evaluator is an independently tested specification oracle; the UI does **not** invoke it to authorize or filter candidates.

## Running a genuine demonstration

Use the isolated local Supabase setup in [DATABASE.md](DATABASE.md), provision consenting adult learner/tutor/champion test accounts with the existing `auth:provision` command, and sign in through `/account/sign-in`. A learner's saved Phase 7 academic context initializes discovery; filters can explore other published contexts without changing enrolment. Boards/grades without published subjects show a coverage gap. All four supported qualification languages can be searched; no missing-language candidate is silently substituted.

The normal seed and provisioning command still create **no** qualifications, verification, TSS or discovery opt-in. Existing trusted local test records are required for a positive result. The disposable records created by `npm run auth:test` demonstrate the full positive/negative database path, then are cleaned up; they are explicitly marked local adult test evidence and do not become real-world verification. For a persistent classroom demonstration, the trusted local operator must intentionally prepare equivalent test qualification/score/verification records for provisioned adults, and the tutor must independently opt in through Settings. There is no browser approval button or automated production approval command.

## Verification and remaining work

- Domain tests cover the SRS weights, grade and TSS boundaries, missing evidence, all verification states and deterministic tie ordering.
- SQL suites cover caller authorization, exact qualifications, privacy projection, pseudonym/opt-in tampering, publication ancestry, revocation, bans/unconfirmed accounts, empty results, time coverage and the 24-result bound.
- The native/Supabase DB runner compares 54 trust/grade/qualification/preference vectors between the independent TS oracle and trusted SQL, then tests a concurrent multi-record trust update using separate PostgreSQL connections.
- The real GoTrue/PostgREST integration suite exercises opt-in persistence, genuine results/ranking, qualification changes, latest test evidence, concurrent commit visibility, role denial, private table isolation and revoked-token replay. UI/HTTP fixtures separately cover interaction states and response validation; they are not proof of API authorization.
- Required checks remain typecheck, lint, all tests, production build, seed/type drift, SQL reset/reseed and dependency audit. Docker remains unavailable on the implementation machine; full Supabase Auth/API and CLI type checks run in the existing CI flow.

No production participation is opened. Suggested Phase 10 scope is an audited trusted review/evidence workflow and explicit consent/safety requirements, followed by separately scoped request/session authorization. Detailed evaluations, booking/orchestration, messaging, AI, production guardian onboarding, cross-day preferences, realtime subscriptions, offline writes and performance-at-scale guarantees remain outside this phase.
