# Phase 4 — grade-aware curriculum

PR #3 was verified merged on GitHub before work began. This branch starts at merged main `5f93b11e8107b51813739d682a41158ada2338c6` and implements only the academic milestone. The landing source/art, workspace routes, matching weights, tutor eligibility and Phase 3 dashboard hierarchy are retained.

## What works

A shared academic picker selects board, learner grade (4–10), subject and resource language in onboarding, My Learning, Settings and Progress. Dashboard recommendations, search, chapter filters, bookmarks, checkpoint denominators and the curated assistant use the same eligibility filter. Unavailable combinations return an honest empty state; there is no fallback to another grade, board, subject or language.

Lessons have academic breadcrumbs, chapter references, a linked assessment and within-chapter previous/next navigation. Direct links outside the selected context show an explanation and require an explicit context change before reading or answering. No automatic prerequisite-revision mode was added. Saved work in other contexts remains available when switching back.

Tutor links carry academic context and an optional eligible lesson ID. Requests snapshot those values, including when cascading to another tutor. Rooms use that attached lesson, rather than the first lesson in a subject. Requests without eligible authored material are labelled open questions and use an honest generic simulation. A changed learner preference cannot relabel an existing request. Tutor academic grades (including 11–12) remain separate from learner preferences and continue to control eligibility.

The assistant searches only selected-context original explanations. Topic query parameters cannot inject another grade’s content. Conversation state and pending replies reset when academic preferences change. These are curated explanations, not live retrieval or AI.

## Domain and persistence boundary

`domain/curriculum.ts` defines Board → Grade → Subject → Chapter → Lesson → Assessment records, stable foreign keys, validation and shared selectors. Chapter source metadata is separate from lesson authorship. Assessments are separate records, referenced by lesson IDs. `CurriculumRepository` provides a typed asynchronous read boundary with a local demo adapter; no database or external service is connected. Validation checks IDs, parent relationships, context consistency and assessment answer bounds in CI.

The existing storage key and all six legacy lesson IDs are retained. Older records without a board default to the original CBSE sample. Unsupported old learner Grades 11–12 normalize to Grade 8 while retaining otherwise valid progress and bookmarks. Invalid/malformed whole records still use known demo defaults. Best checkpoint scores remain unchanged; unknown lesson IDs cannot be newly saved or scored. Off-context saved/progress records are retained but excluded from the selected-context counts. Preferences remain shared fictional browser data, not production account isolation.

## Catalog coverage

All eight lessons and checkpoints are original Village Vidya practice, in English only. Official sources verify the two reference chapter mappings, not the original lesson wording, translations, complete syllabus coverage or current-year alignment.

| Learner grade | CBSE sample coverage                                                                                           | Lessons / assessments |
| ------------- | -------------------------------------------------------------------------------------------------------------- | --------------------- |
| 4             | No content yet                                                                                                 | 0 / 0                 |
| 5             | No content yet                                                                                                 | 0 / 0                 |
| 6             | Supplementary fractions, water cycle, verb tenses and local government; no official chapter mapping claimed    | 4 / 4                 |
| 7             | Supplementary plant nutrition; no official chapter mapping claimed                                             | 1 / 1                 |
| 8             | Linear Equations in One Variable, Chapter 2, NCERT Mathematics reprint 2024–25; one introductory practice note | 1 / 1                 |
| 9             | No content yet                                                                                                 | 0 / 0                 |
| 10            | Real Numbers, Chapter 1, NCERT Mathematics reprint 2025–26; prime factorisation and HCF/LCM practice           | 2 / 2                 |

Maharashtra State Board is selectable to exercise the board boundary, with **zero content in every grade**. Hindi, Marathi and Telugu preferences retain greetings/navigation and tutor-language matching but have **zero translated lessons**; English is offered explicitly, never substituted automatically. Subject choices are search areas, not claims that all four subjects occur as official subjects in every grade/board.

### Verified references (22 October 2026)

- [NCERT Class VIII chapter PDF, Linear Equations in One Variable](https://www.ncert.nic.in/textbook/pdf/hemh102.pdf): Chapter 2, reprint 2024–25, equations in one variable. This is an edition-specific reference, not a current-year syllabus claim.
- [NCERT Class X Mathematics contents](https://www.ncert.nic.in/textbook/pdf/jemh1ps.pdf): reprint 2025–26; Chapter 1 Real Numbers and section 1.2 Fundamental Theorem of Arithmetic.
- [NCERT ePathshala Class 10 Mathematics](https://epathshala.nic.in/topicc.php?id=1062CH01): independently confirms class, subject, chapter number and title.

The Class VIII PDF was readable through the web tool. The Class X chapter PDF timed out; its mapping/edition was verified from the official indexed contents and ePathshala metadata, rather than claiming that unavailable file was read. Full ingestion, official board syllabus verification and educational review remain future work. No textbook content was copied into these original lessons.

## Verification and review scope

96 automated tests cover the domain, learner boundaries, board/subject/language filters, missing content, next actions, relationships, route gates, migration, saved/progress consistency, Grade 10 chapter → lesson → checkpoint → next lesson, AI context, matching context/cascade, tutor eligibility, ELIC, role navigation and existing workflows. Typecheck, ESLint and production build all pass. The production static cache is 1,049 KB across 33 files (below the 50 MB limit). The two existing nonfatal Zod annotation warnings remain. Landing source/art hashes also match the preserved baseline.

Browser verification uses the running application with a real fictional learner login: grade switching, Grade 4 empty state, Grade 10 checkpoint (100% saved), and academic links. CSS viewports 320 and 390 were inspected on mobile; My Learning was also checked at 768, 1024, 1280 and 1440 CSS pixels. Document width matched viewport width for the tested layouts. The temporary ignored same-origin frame reports viewport and document widths; this is CSS layout testing, not physical-device emulation. Only two screenshots are retained in [screenshots/phase-4](screenshots/phase-4), without rebuilding historic branches or regenerating baselines.

## Status inventory

| State                                 | Scope                                                                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Implemented and verified              | Local typed hierarchy, context validation/filtering, learner grade bounds, migration, chapter/lesson/checkpoint navigation, scoped recommendations/search/bookmarks/progress/AI, tutor request snapshots and regression checks |
| Implemented but externally unverified | Physical devices, full assistive-technology/educational review, board-wide/current-year syllabus compatibility and external source availability                                                                                |
| Demo simulation                       | Fictional accounts, browser preferences/progress, curated explanations, matching/session/ELIC replies and sample Co-Teacher evaluations                                                                                        |
| Not implemented                       | Complete Grades 4–10 curriculum, translated notes, other board catalogs, official textbook ingestion/search index, live AI, backend auth, PostgreSQL persistence, production account isolation or cross-device sync            |

This phase ends at one review PR. Do not merge automatically or begin Phase 5.
