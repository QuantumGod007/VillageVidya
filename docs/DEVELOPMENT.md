# Sequential review strategy

The repository was inspected on 22 October 2026. Remote `main` had one initial README commit (`cd996a0991373a2742f5641709859b9f3d17862e`), no application source, and no pull requests. The working demo existed only in the local workspace.

The prerequisite milestone is therefore a runnable demo foundation. It contains the implementation completed before the incremental workflow directive. Dashboard restructuring is a separate subsequent improvement, not bundled into that foundation.

| Milestone | Review boundary | Status |
| --- | --- | --- |
| Runnable demo foundation | Existing local app, truthful demo states, domain/interaction tests, build/CI, SRS mapping and original design | Merged as PR #1 (`c9727a3`) |
| Workspace navigation architecture | Persistent internal shell, focused role navigation, route hierarchy and return paths | Merged as PR #2 (`2ffd8e2`); see PHASE-2.md |
| Learner overview | One next action, next session, continue learning and relevant recent activity | Phase 3 implemented for review; see PHASE-3.md |
| Tutor teaching workflow | Requests and next session first; dedicated schedule/availability and feedback/growth pages | Overview hierarchy implemented in Phase 3; dedicated workflow improvements remain deferred |
| Sessions and learning progress | Separate lifecycle views, details and purposeful mastery/history destinations | Planned; reassess boundaries after previous merges |
| Governance roles and accessibility | Dedicated consent/updates, verification/moderation and operations views; genuine responsive and keyboard fixes | Planned; split only when independently valuable |

There is no PR quota. Discovery, the practice room, and the assistant already have functioning local demonstrations; further UX changes should follow the audit, not be repeated to generate commits.

For each subsequent milestone: fetch and fast-forward local main after the prior approved merge, create one descriptive branch, implement only that boundary, review the full diff, run relevant tests plus typecheck/lint/build, commit and push, open one PR with UI evidence, verify CI and merge readiness, and wait for human approval. Never force-push, manufacture commits, or merge automatically.

The more detailed [dashboard audit and target architecture](DASHBOARD-UX.md) is a proposed backlog. It has not been implemented by the foundation PR. The public landing page is retained.

Phase 2 follows the explicit branch name `design/workspace-navigation`. Later milestones remain unstarted until this PR is approved and merged and the user supplies the next phase prompt.

Phase 3 follows the explicit branch `design/role-dashboard-experience`, limited to learner/tutor dashboard content and the state needed to represent actual visit activity and safe next actions. Later milestones require review, merge and a new user prompt.
