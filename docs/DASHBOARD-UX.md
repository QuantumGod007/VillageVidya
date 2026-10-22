# Dashboard UX audit and proposed restructuring

**Status: navigation shell implemented in Phase 2; dashboard content restructuring remains planned.** Follow the sequential review gates in DEVELOPMENT.md.

## Audit

The public landing page is retained. The internal audit found the following structural issues:

- The global marketing navigation and footer remain inside authenticated task flows, competing with workspace navigation.
- My Learning, tutor discovery, Community and lesson reading leave the workspace shell, breaking orientation and the return path.
- The learner overview mixes a large decorative continue card, duplicate tutor/assistant shortcuts, subject cards, a learning journey, community promotion, mastery, and milestones. It does not make the next step or recent activity sufficiently clear.
- Tutor statistics occupy the first viewport before incoming requests; availability appears in two places. Scheduling is an illustrative sidebar widget rather than a dedicated interface.
- Detailed coaching, growth goals, and progression are intermixed on the tutor overview even though a feedback route exists.
- Guardian consent and digest controls, Champion verification and moderation, and administrator service readiness are combined on broad overview pages with no distinct destinations.
- Sessions combine upcoming and active states, with no detail destination. Progress has no dedicated page.
- The mobile sidebar disappears, leaving task navigation in a general marketing menu.

## New information architecture

| Role | Primary destinations | Overview responsibility | Contextual controls |
| --- | --- | --- | --- |
| Learner | Overview, Find tutors, My learning, Sessions, Ask AI, Progress, Community | One next action, next session, continue learning, recent activity | Filters/profiles in tutors; checkpoints in lessons; mastery and milestones in Progress |
| Tutor | Overview, Requests, Schedule, Sessions, Co-Teacher, Teaching growth, Community | Requests first, next session, availability status and recent teaching | Weekly availability in Schedule; rubric in Co-Teacher; goals/ladder/history in Teaching growth |
| Guardian | Overview, Learning progress, Consent, Updates | Learner summary and relevant update | Consent preview and digest preferences on their own pages |
| Champion | Overview, Verification, Moderation, Safety reports | Work requiring attention | Review decisions within the appropriate queue |
| Administrator | Overview, Curriculum, Users, Operations | Current demo scope and participation | Catalog/user inspection in dedicated views; service readiness and export in Operations |

All internal destinations retain one app shell, clear active navigation, contextual breadcrumbs and role permissions. On phones, a compact app header opens the same role-specific destinations. Existing public discovery pages remain available without changing the landing page.

## Data and safety scope

No database change or new external integration is required. Schedule preferences, session navigation state, and activity are local demo state. All existing demo labels, consent restrictions, role gates, matching rules, and sample AI provenance remain in force. Each future branch is for review and must not be merged automatically.

## Phase 2 implementation boundary

See [PHASE-2.md](PHASE-2.md) for the actual route map and interim section destinations. Shared discovery and lesson routes now retain the workspace, mobile uses the complete role navigation, and marketing chrome stays outside internal workflows. Dashboard content has not been rearranged in depth.
