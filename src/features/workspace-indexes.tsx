import { lessons, demoProfiles } from "../data/demo";
import { useStore } from "../lib/store";
import { ButtonLink, Eyebrow, Progress } from "../components/ui";
export function LearningProgress() {
  const { data, completed } = useStore();
  const count = lessons.filter(
    (lesson) => data.progress[lesson.id] === 100,
  ).length;
  return (
    <div className="workspace-index workspace-page">
      <div className="page-heading">
        <Eyebrow>YOUR SMALL STEPS</Eyebrow>
        <h1>
          Your learning, <em>in view.</em>
        </h1>
        <p>
          Checkpoints from the fictional lesson library, saved on this device.
        </p>
      </div>
      <p className="workspace-index-summary">
        <strong>
          {count} of {lessons.length}
        </strong>{" "}
        checkpoints completed · {completed.length} practice sessions this visit
      </p>
      <div className="workspace-index-list">
        {lessons.map((lesson) => (
          <article key={lesson.id}>
            <div>
              <span className="small muted">
                {lesson.subject} · Grade {lesson.grade}
              </span>
              <h2>{lesson.title}</h2>
              <Progress
                value={data.progress[lesson.id] || 0}
                label={`${lesson.title} mastery`}
              />
              <span className="small muted">
                {data.progress[lesson.id] || 0}% checkpoint progress
              </span>
            </div>
            <ButtonLink to={`/lesson/${lesson.id}`} variant="outline">
              {data.progress[lesson.id] === 100
                ? "Review lesson"
                : "Continue lesson"}
            </ButtonLink>
          </article>
        ))}
      </div>
      <p className="small muted">
        This is demo checkpoint progress, not a formal academic assessment. This
        demo includes a small mixed-grade library. Each lesson displays its own
        grade.
      </p>
    </div>
  );
}
export function DemoUsers() {
  return (
    <div className="workspace-index workspace-page">
      <div className="page-heading">
        <Eyebrow>PLATFORM DIRECTORY</Eyebrow>
        <h1>
          The people in <em>this demo.</em>
        </h1>
        <p>
          Five fictional profiles demonstrate role-specific workspaces. Real
          user administration is not connected.
        </p>
      </div>
      <div className="workspace-index-list">
        {Object.entries(demoProfiles).map(([role, profile]) => (
          <article key={role}>
            <div>
              <span className="small muted">
                {profile.label} · fictional profile
              </span>
              <h2>{profile.name}</h2>
              <p>{profile.description}</p>
            </div>
            <span className="tiny-pill">Demo only</span>
          </article>
        ))}
      </div>
      <p className="small muted">
        Real user administration is unavailable in this demo. No live user
        records are shown or editable here.
      </p>
    </div>
  );
}
