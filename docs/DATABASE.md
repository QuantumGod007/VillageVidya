# Database setup and security

Phase 6 adds Supabase sign-in for provisioned adult test accounts. Public registration and real tutoring remain closed; fictional demo data stays separate. No server/service-role key belongs in browser configuration.

## Local Supabase

Requires Node 22.12+, npm and a running Docker-compatible container runtime. Use an isolated local project; never expose the development stack publicly.

```sh
npm ci
cp .env.example .env.local
# Run once; an existing network can be reused.
docker network create -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 village-vidya-local
npm run db:start
npm run db:reset
VV_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm run db:test
npm run db:types:check
npx supabase stop --no-backup
```

`db:start` runs PostgreSQL only. For real local Auth/API testing, start the same loopback network with `npm run auth:start`, reset the local DB, then run `npm run auth:configure` (creates `.env.local` only if absent). If you copied `.env.example` first, edit that file instead: set `VITE_APP_MODE=supabase` and copy only the local public anon/publishable key. Restart Vite; open `/account/sign-in`. No hosted project is linked or changed.

Provision only a consenting adult tester, including when testing the learner workspace. In your shell set/export `VV_AUTH_EMAIL`, `VV_AUTH_NAME`, `VV_AUTH_ROLE` (learner/tutor/guardian/champion/admin), `VV_ADULT_TEST_ACCOUNT=true`, and read/export `VV_AUTH_PASSWORD` securely (12+ characters, avoid shell history). Then `npm run auth:provision`. Optional `VV_TUTOR_GRADE` defaults to test grade 12; this does not verify academic eligibility. The tool refuses remote services, creates Auth identity using the server Admin API, then commits profile/role/test access transactionally, compensating Auth creation on failure. No guardian consent, tutor verification, TSS, sessions or demo progress is created. Server keys stay in process memory.

`npm run auth:test` creates/cleans disposable local adult accounts and tests real Auth sign-in/failure/restore/refresh/recovery/sign-out and API authorization. CI runs the full local stack. Local recovery emails are captured at `http://127.0.0.1:54324`; recovery links must be opened in the requesting browser (PKCE). Production mail delivery and redirect allowlists require separate configuration. CI verifies local SMTP capture, the recovery redirect, PKCE exchange and password changes; external email deliverability remains unverified. Global public signup, anonymous sign-in and SMS signup stay disabled. The email provider is enabled so existing provisioned adults can sign in; global signup denial is tested over the real API.

Migrations apply in filename order: academic catalog, identity/trust, learning/tutor relationships, then explicit grants and RLS. Every table has RLS from its creation. Reset replays all migrations and the curriculum seed; **reset destroys local database data**. Never run a linked/remote reset with these commands. To change the schema, add a new versioned migration, reset, run tests, then `npm run db:types` and commit generated types. The generator preserves existing types on failure. `npm run db:seed:generate` rebuilds the checked-in seed from the original Phase 4 catalog; CI checks drift.

## Schema and access matrix

22 application tables, grouped by purpose:

| Tables                                                                                                  | Authenticated client access                                                         | Trusted writes                                               |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| adult_test_accounts                                                                                     | Own enabled access read only                                                        | Local adult test provisioning/revocation                     |
| profiles                                                                                                | Own read/edit display name and language; verified related guardian can read learner | Provision/delete; no client role or consent field            |
| user_roles, learner_profiles                                                                            | Own read; related guardian may read learner profile                                 | Roles/provisioning only on server                            |
| tutor_profiles                                                                                          | Own read/edit bio                                                                   | Academic grade, TSS and session count                        |
| guardian_relationships                                                                                  | Participants read                                                                   | All decisions/provisioning                                   |
| guardian_consent_records, tutor_verification_records                                                    | Participants / own tutor read                                                       | Append-only service inserts; no service update/delete grants |
| academic_boards, academic_grades, academic_subjects, chapters, lessons, assessments, curriculum_sources | Published reads only, also for anon                                                 | All mutations                                                |
| learner_academic_enrollments                                                                            | Own create/read/delete and active-state update; related guardian read               | Provisioning/administration                                  |
| lesson_progress                                                                                         | Own and verified related guardian read                                              | Scores require trusted evaluation                            |
| assessment_attempts                                                                                     | Own read only                                                                       | Append-only scored attempts                                  |
| learner_bookmarks                                                                                       | Own read/insert/delete, composite key makes repeated saves idempotent               | Administration                                               |
| tutor_subject_qualifications, tutor_languages                                                           | Own read                                                                            | Trusted qualification writes                                 |
| tutor_availability                                                                                      | Own read/create/edit/delete                                                         | Administration                                               |

Anon has no private-table grants. App Admin/Champion roles do not grant privileged SQL writes; future audited server operations must authorize them. Policies use `auth.uid()` and existing ownership checks. A new argument-free, fixed-search-path SECURITY DEFINER helper reads Auth sessions and the trusted adult-test gate; restrictive policies intersect ownership with live session access. It exposes no private records or mutation capability. Deleting the Auth session, banning an account or disabling adult test access denies private API reads even with a still-valid JWT. Generated types describe table shapes, not permission to mutate them.

Relationships are normalized: Board → Grade (4–10) → Subject → Chapter → Lesson → Assessment. Lessons derive board/grade through their parent path; they cannot carry a contradictory duplicate grade. Attempt assessment/lesson pairs have a composite FK. Tutor grades separately allow 4–12. Progress/bookmarks are unique per learner/resource. Only one enrollment can be active per learner. Histories use monotonic event numbers; the latest consent event governs access, so revocation overrides an older approval. Audit-parent deletions are restricted; a future retention/account-purge process needs explicit privileged handling.

All new curriculum is unpublished by default. Every published ancestor and any referenced source must also be readable. The seed explicitly publishes only the existing eight English original-practice notes, seven chapters and two edition-specific metadata sources; no missing-grade, Maharashtra or translated lessons are invented. Answer keys are public for these original practice checkpoints, **not secure examination material**. Authenticated clients cannot forge scored attempts or mastery.

## Verification and remaining gates

The Node SQL suites execute on actual PostgreSQL, change to non-bypass `anon`/`authenticated` roles, set JWT claim contexts, and assert both grants and RLS. They cover fresh migrations/reseed, FK/check/unique constraints, isolation, escalation, consent/verification tampering and revocation, publication ancestry, trusted writes and safe owner writes. Test identities/evidence exist only in a rolled-back transaction; the regular seed contains no people, consent or verified tutors.

Docker is unavailable on the implementation machine. Six SQL suites pass on PostgreSQL 16 in **two independently created/reset disposable databases**, using a minimal Auth users/sessions/JWT fixtures. This is not a claim that GoTrue or PostgREST was tested locally. CI starts the full local Supabase stack, repeats the suites on PostgreSQL 17 and its real Auth schema, resets/reseeds, checks generated types and runs real Auth/API integration. The separate frontend/domain suite remains required.

For a disposable native PostgreSQL cluster only, `VV_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/postgres npm run db:test:native` creates/drops random test databases and installs minimal auth roles/fixtures there. Tests refuse non-loopback URLs. Do not point native bootstrap at an existing application cluster. The checked-in types were generated from the migrated native schema with Supabase's official postgres-meta 0.100.0 introspection generator; normal regeneration uses the pinned CLI.

| Status                                | Scope                                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Implemented and verified              | Schema/RLS including live-session gate, original seed, typed adapters, five-role account boundary and automated Auth/API checks in CI |
| Implemented but externally unverified | Hosted deployment, physical-device/backend behavior, full local Supabase runtime where Docker is absent                               |
| Demo simulation                       | Existing fictional accounts/progress, local matching, consent previews and prewritten replies; none is auto-imported                  |
| Not implemented                       | Public signup, production consent/physical verification/scoring, communication, retention/export/purge and cross-device sync          |

Before real users: trusted services must verify guardian identity/evidence and policy versions, validate reviewer authority/physical tutor grade and subject/language eligibility, derive scores atomically, and enforce safety/moderation and retention. SQL cannot prove those real-world facts. Future matches/sessions should reference authenticated participant UUIDs, qualifications and academic IDs; no speculative session tables were added. A future opt-in demo transfer must validate owned published resource IDs server-side: bookmarks may transfer after consent; local checkpoint percentages are untrusted and need reassessment, never automatic promotion to trusted mastery.
