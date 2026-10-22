# Phase 2 — Workspace navigation

## Scope and baseline

Branch `design/workspace-navigation` starts at merged main `c9727a3a882b0c31b2ebccddfd9dcb6f0a08aa59` (foundation PR #1). The working tree was clean before branching. This milestone changes navigation, layouts and feature discoverability. It does not redesign dashboard contents or connect a backend.

The public landing component, artwork and existing public layout markup are preserved. New CSS is scoped to the workspace and its new navigation/index components. Public discovery URLs still work without a fictional profile. With a profile, the same URLs retain the internal shell.

## Navigation contract

`src/components/workspace-navigation.ts` owns role destinations, group labels and active matching for both desktop and mobile. Existing canonical URLs remain valid, including links with subject filters. Lessons activate their learning parent; practice rooms activate Sessions. The desktop sidebar starts at 1024 CSS pixels; smaller widths use a compact header and a native modal with the same destinations.

| Role | Destinations |
| --- | --- |
| Learner | Overview `/learn`; My Learning `/explore`; Find Tutors `/tutors`; Sessions `/sessions`; Ask AI `/assistant`; Progress `/learn/progress`; Community `/community`; Settings `/settings` |
| Tutor | Overview `/studio`; Requests `/studio#requests`; Schedule `/studio#schedule`; Sessions `/sessions`; Co-Teacher Feedback `/studio/feedback`; Teaching Growth `/studio#growth`; Community `/community`; Settings `/settings` |
| Guardian | Overview `/guardian`; Learner Progress `/guardian#progress`; Consent `/guardian#consent`; Updates `/guardian#updates`; Settings `/settings` |
| Champion | Overview `/champion`; Tutor Verification `/champion#verification`; Moderation `/champion#moderation`; Safety Reports `/champion#reports`; Settings `/settings` |
| Administrator | Overview `/admin`; Curriculum `/explore`; Users `/admin/users`; Operations `/admin#operations`; Settings `/settings` |

Section destinations deliberately retain existing functional overview sections, as permitted by Phase 2. They scroll to and focus their controls, highlight exactly one navigation item and show their context in the header and breadcrumbs. Separate scheduler, growth, consent and governance screens belong to later feature phases. No empty routes were created to fill the menu.

Progress is a small index of existing browser checkpoint state with links back to lessons. Users is a read-only directory of the five fictional role profiles with an explicit notice that real user administration is unavailable. Curriculum opens the existing original-note library; no publishing or ingestion tool is implied.

`AppRoutes` is extracted from the DOM entry point so tests exercise actual route composition. Public marketing routes and protected workspace routes have separate layouts. Shared discovery selects the correct shell from the demo role. `StoreProvider` stays above the router, retaining matching requests and visit state across page transitions. Practice rooms now retain workspace navigation and return paths.

## Accessibility and states

- Semantic sidebar, header, main and breadcrumb navigation; grouped links and `aria-current` on active destinations.
- Skip link focuses main without overwriting an existing section hash.
- Page changes focus main; section links focus their target after lazy content is ready, including a direct reload.
- Native modal supports keyboard navigation, Escape and close-button focus return. Selecting a destination closes it and focuses the destination content.
- Lazy page loading retains the shell; global error recovery remains available. Unknown internal URLs offer a return to the role overview.
- Connectivity, storage warnings and existing toast feedback remain visible inside the workspace. The header identifies the fictional, device-local scope.
- Public website and Leave demo actions are reachable on desktop and mobile. Logout returns to profile selection.

## Status

| State | Items |
| --- | --- |
| Implemented and verified | Role navigation, separate layouts, active routes, breadcrumbs, responsive shell, deep-link focus, mobile navigation parity, existing checkpoint index and role restrictions in the fictional demo; local checks and browser evidence below |
| Implemented but externally unverified | Physical-device and full assistive-technology coverage; field testing on low-memory/poor-network hardware |
| Demo simulation | Existing profiles, session acceptance/replies, Co-Teacher evaluations, consent/digest previews and Champion training reviews; Users directory shows only fictional profiles |
| Not implemented | Real authentication/RLS, verified consent/identity, live AI/SMS/realtime, user administration, curriculum ingestion and real scheduling; dedicated dashboard redesigns; grade-scoped curriculum/recommendations remain a known foundation limitation for the learner phase |

No SRS matching, eligibility, TSS, Co-Teacher weights or safety rules change in this milestone. No credentials, dependencies, migrations or external integrations are added. Existing client-side role gates remain demo controls, not production authorization.

## Evidence

Before and after screenshots are in [screenshots/phase-2](screenshots/phase-2). They show actual CSS viewport widths inside a same-origin QA frame, scaled only when necessary to fit the browser capture. This is responsive CSS inspection, not device emulation. The temporary QA harness is ignored and excluded from the production build. Some baseline captures have a smaller enclosing browser window; their filenames identify the CSS width, not the PNG width.

The learner shell was inspected at 320, 390, 768, 1024 and 1440 CSS pixels; document width equalled viewport width at each. Screenshots show the desktop/sidebar and compact header transitions. Additional evidence covers the 320px menu, Guardian Consent, Champion Safety Reports, administrator Users and tutor Schedule. Standalone browser inspection confirms sticky header/sidebar behavior and direct section focus after reload.

Automated verification covers real route composition for every role, active state, direct lesson and section links, protected routes, public discovery, unknown URLs, mobile destination parity for all roles, keyboard menu activation/close, logout and the lesson → checkpoint → Progress journey. Existing domain and interaction tests retain matching, sessions, ELIC, AI fallback and trust-state regression coverage.

See [QA.md](QA.md) for final check results. This PR must be reviewed and must not be merged automatically. Phase 3 has not begun. The deployed Site remains the foundation version until a separate authorized publication.
