# Verification record

## Automated foundation checks

- TypeScript strict check: passed.
- ESLint: passed with no warnings.
- Vitest/Testing Library: 39 tests passed across domain and interaction suites.
- Production Vite build: passed; the build generates a versioned service worker and checks the 50 MB cache budget.
- Dependency audit: zero vulnerabilities.
- Production static app/reading cache: approximately 1008 KB (uncompressed), below the 15 MB client and 50 MB cache limits.
- Build emits two non-fatal upstream Zod comment-annotation notices; application type/lint/test checks are clean.

Coverage includes exact CMS and rubric weights, eligibility, grade boundaries, TSS floor, EMA display, skill tiers and grace, role gates, malformed storage, fictional acknowledgement, closed real registration, mastery, bookmarks, contact redaction, ELIC, reconnection, accepted-session cancellation, invitation cascade/fallback, unsupported assistant questions, and navigation dialogs.

## Browser verification

Reviewed the actual running app in the Codex in-app browser. Verified the landing interaction, fictional sign-in, learner overview, tutor profile factors, invitation acceptance, practice-room entry, ELIC event/nudge, Co-Teacher report, guardian digest/consent preview, Champion training view, admin readiness view, and preferences. Domain interactions are also covered by the automated suites.

Responsive screenshots use same-origin iframes with actual CSS viewport widths; wide frames are scaled to fit the browser screenshot. This checks responsive CSS, not device hardware emulation. Learner overview baselines were reviewed at 1440, 1024, 390 and 320 CSS pixels. Screenshot metadata records the actual inner width. The temporary QA harness is ignored and is not shipped.

The dashboard audit identifies substantial navigation/content-placement work for subsequent PRs. Foundation screenshots are baseline evidence, not claims that the requested restructuring is complete. See DASHBOARD-UX.md and DEVELOPMENT.md.

## Verification limits

No production auth, SMS, official curriculum retrieval, live AI, cross-device realtime, WebRTC, or database is connected, so those services cannot be end-to-end tested in this release. The static cache is built and budget checked; intermittent-network field tests, full browser-offline transport tests, Android hardware coverage, assistive-technology audits and SUS studies remain planned. No SRS latency, uptime, memory, or learning-outcome target is claimed.

## Phase 2 workspace navigation (22 October 2026)

- TypeScript, ESLint, 65 tests (39 existing + 26 route/navigation regressions), and production build pass.
- Offline static cache: approximately 1020 KB uncompressed, within the existing budget. The same two non-fatal upstream Zod annotation notices remain.
- Landing and learning-art SHA baselines pass. CSS changes are appended under workspace-specific selectors. No dependencies, domain formulas or stored-data schema changed.
- Actual browser inspection at 320, 390, 768, 1024 and 1440 CSS pixels confirms the learner shell fits without horizontal document overflow. Desktop sidebar begins at 1024; compact navigation is available below it.
- Verified native dialog open, Tab navigation, Escape and close focus return, selection-to-content focus, role-specific destinations, Guardian Consent and Champion Safety Reports at 320, administrator Users at 320, and tutor Schedule on desktop. Direct section reload focuses the target after lazy loading. Standalone browser geometry confirms header and sidebar stay at viewport top while content scrolls.
- Verified tutor sample request → practice room → ELIC nudge → Sessions. The accepted request remains in visit state, Sessions highlights in the room, and the marketing header/footer are absent.
- Automated route tests exercise all five role menus, mobile/desktop destination parity, access restrictions, logout, public discovery, lesson breadcrumbs, unknown routes and a completed checkpoint appearing in Progress after navigation.
- Before/after evidence: [Phase 2 screenshots](screenshots/phase-2). Responsive evidence uses actual CSS viewport widths in a same-origin frame, scaled for wide captures; it is not physical-device emulation. Additional standalone captures show the room and sticky Schedule destination.
- Remaining feature/verification limits and the four-state status inventory are recorded in [PHASE-2.md](PHASE-2.md). New navigation names are English; existing partial learner translations for Overview, My Learning and Find Tutors are retained when a regional preference is selected.

## Phase 3 learner/tutor dashboards (22 October 2026)

- TypeScript strict checks, ESLint, 82 tests (65 existing + 17 dashboard cases) and the production build pass. The landing/artwork baseline hashes pass, and the Phase 2 shell/navigation files have no changes.
- Automated coverage includes chosen-subject lesson priority, fully complete and fresh states, exclusion of completed/cancelled sessions, future IST demo-plan order, unknown/elapsed slot labels, actual checkpoint attempts, retained best progress, visit-only activity, manual sample requests, accept/decline, ELIC, availability, calculated sample feedback, logout and safety-stopped room exclusion.
- Both dashboards were inspected and captured at 320, 390, 768, 1024 and 1440 CSS pixels. Document width equalled viewport width at every size. A separate refinement pass tightened narrow layouts, touch targets, markers and context wrapping. Evidence: [Phase 3 screenshots](screenshots/phase-3).
- Browser journey: tutor creates a labelled sample request → accepts it → uses ELIC → rates/completes the practice → returns to the overview. One completed practice, one confusion checkpoint and the calculated sample TSS of 91.96 appear; the completed room is no longer a ready action. Empty visit screens show no invented requests or completed history.
- Browser journey: learner chooses Tomorrow, 4:00 PM in the existing tutor profile → simulates acceptance → returns through Sessions to the overview. The accepted future plan appears with its fictional-booking label. Completing the fractions checkpoint changes the next action to equations, raises the checkpoint count and adds an actual timestamped activity entry.
- Tutor before screenshots were recaptured from an untouched copy of merged main after detecting a development overlay in the initial captures. The verified baseline uses bundled font assets; invalid captures were replaced. Wide screenshots are scaled CSS viewports, not device emulations.
- No new dependencies, migrations, backend integrations or persistent personal data. Static offline cache remains around 1.0 MB, below the existing budget. Existing two non-fatal upstream Zod annotation warnings remain.
- Production accounts, grade-specific curriculum, real scheduling/AI and cross-device history remain deferred. See the four-state inventory and implementation limits in [PHASE-3.md](PHASE-3.md).

## Phase 4 — academic context

- Final local checks: typecheck PASS, ESLint PASS, 96/96 tests PASS (5 files), production build PASS. Static offline cache: 1,049 KB / 33 files. Existing nonfatal Zod annotation warnings only.
- Added 14 curriculum tests: learner 4/10 boundaries, invalid grades, board/subject/language filtering, no unrelated recommendation fallback, foreign keys/assessment bounds, bookmarks/progress denominators, legacy migration, invalid/mismatched lesson routes, Grade 10 assessment/next lesson, AI grounding, matching cascade snapshots and tutor-grade eligibility. Prior route, role, session and ELIC checks remain green.
- Browser: actual fictional learner login; Grade 8 → 10 library switch; Grade 4 missing-content state; Grade 10 correct checkpoint persisted at 100%; contextual links and responsive composition. My Learning checked at 320, 390, 768, 1024, 1280 and 1440 CSS pixels; lesson checked at 320 and 390. Document widths matched the tested CSS viewports. Native labelled controls and existing keyboard navigation are retained; full assistive-technology/device audits remain external verification.
- Two representative screenshots only: [desktop library](screenshots/phase-4/desktop-library-1280.png) and [mobile lesson](screenshots/phase-4/mobile-lesson-390.png). The mobile image uses an ignored same-origin viewport frame. No historical branch was rebuilt and no baseline screenshot regenerated.
- Landing source/art SHA checks PASS. Workspace shell and dashboard content hierarchy retained. See [PHASE-4.md](PHASE-4.md) for the source-verification record, grade-wise coverage and limitations. Production registration, official ingestion, live AI, database/account isolation and translations remain unimplemented.
