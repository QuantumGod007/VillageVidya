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
