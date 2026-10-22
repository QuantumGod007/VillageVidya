# Phase 3 — Learner and tutor dashboard experience

## Baseline and scope

Verified PR #2 merged on GitHub before branching. `design/role-dashboard-experience` starts from current main `2ffd8e255d55c9ea03d871645345316c13950d0a`, with no local changes. This milestone redesigns learner and tutor overview content. The public landing, Phase 2 shell, role destinations and other role dashboards are preserved.

## What changes for learners

The selected grade, language and subject appear together beneath a personalized heading. One primary action takes priority: an accepted, unfinished immediate practice room; otherwise an unfinished lesson in the selected subject, preferring existing progress. Once that subject is complete, the small mixed-grade library supplies another unfinished lesson with an explicit explanation. All-complete state links to review instead of manufacturing a new goal. This is a deterministic suggestion from existing demo data, not AI or grade-specific curriculum infrastructure.

The primary lesson is excluded from the secondary Continue Learning rows so it is not presented twice. Those rows show actual saved checkpoint percentages and each lesson’s own grade. A real accepted future demo plan appears before those rows when available. Progress, saved lessons, tutor discovery, AI demo and Community remain quieter secondary links, rather than competing action tiles or promotional illustrations.

Recent learning combines checkpoint actions and completed practice metadata from this visit. Seeded progress is not given fictional dates or represented as recent activity. A checkpoint attempt records only an ID, lesson ID, time and score in memory (maximum 30); incorrect answers retain the previous best saved progress. Activity is cleared on reload, logout, reset or demo expiry. No answer text, message or note is persisted in this list.

## What changes for tutors

Pending invitations now occupy the first actionable panel, followed by the next accepted future plan, availability, recent completed teaching, concise Co-Teacher context and teaching progress. Empty states show the absence of real visit activity. A sample request is created only when the user explicitly chooses the labelled practice action; it follows the existing 45-second expiry and accept/decline flow. The completed-session count uses this visit’s actual records. The existing illustrative TSS baseline and sample evaluations remain explicitly identified.

Availability has one control on the overview, synchronized with the existing catalog. The full Co-Teacher report remains on its existing route; its overview excerpt appears only after a completed visit session and is labelled illustrative, not live AI analysis. Teaching score and tier use the same catalog calculation as discovery, including grace rules. Ladder details are collapsed, and the existing practice-goal control remains accessible. Phase 2 `#requests`, `#schedule` and `#growth` links continue to work.

The old fabricated-looking weekly schedule and automatically displayed sample request are replaced by actual visit state and a manual exercise. No calendar or booking backend has been added. Existing slot labels are interpreted in IST against their request date to sort future accepted plans; elapsed and unknown labels are not called upcoming. All plans remain fictional and can still be inspected in Sessions.

The dashboard must not promote a stopped room as its next action. A safety stop or reconnection-grace termination therefore cancels the accepted local request. A stopped or completed room cannot be reopened as active through its old URL. Existing in-room terminal feedback and completion summaries remain available in the current room.

## Design and refinement

The composition uses one primary surface, ruled learning/activity lists and a quiet summary column. DM Sans provides task hierarchy; Instrument Serif adds emphasis to the main prompt and selected headings. The existing off-white/cobalt palette, fonts and navigation are retained. There are no decorative chart grids, new imagery, gradients or dependencies.

An additional screenshot review tightened the mobile primary-panel typography and spacing, increased small-link touch targets, neutralized secondary row markers and removed a duplicated tutor-profile label that wrapped awkwardly at 320px. Content styles live in `role-dashboards.css` and are scoped to the new dashboard classes; marketing and workspace-shell CSS are unchanged.

## Status inventory

| State | Scope |
| --- | --- |
| Implemented and verified | Learner/tutor hierarchy, subject-based demo next action, real visit activity/empty states, accepted-plan selection, request controls, availability, derived teaching summaries, existing route/role boundaries, responsive layouts and automated/browser workflows |
| Implemented but externally unverified | Physical-device performance and full assistive-technology validation; screenshots verify CSS viewports rather than hardware |
| Demo simulation | All fictional identities, explicit sample requests, local conversations, existing TSS seed history, curated replies and sample Co-Teacher evaluations; future plans are previews with no real booking |
| Not implemented | Backend authentication/authorization, grade-specific curriculum ingestion, persistent cross-device activity, real learner requests/bookings, live AI and real notification delivery |

Matching weights, eligibility and grade boundaries, the five Co-Teacher weights, TSS update, skill-tier rules and child-safety redaction are not changed. Store changes add bounded visit activity and clear visit records on expiry. The existing persisted preference/progress schema is unchanged. No migration, dependency or external integration is added. No SRS requirement is silently removed.

## Evidence and review boundary

Before/after screenshots for both dashboards at 320, 390, 768, 1024 and 1440 CSS pixels are in [screenshots/phase-3](screenshots/phase-3). A temporary, ignored same-origin QA frame sets actual CSS widths and reports viewport/document width. Wide frames scale to fit the enclosing screenshot; these are not device emulations. Document width matched viewport width for both roles at all five sizes. Additional screenshots record explicit requests, completed teaching and actual learner state.

Automated and browser results are recorded in [QA.md](QA.md). This phase ends at its separate review PR. It must not auto-merge. Phase 4 and publication of the deployed Site remain unstarted.
