import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import {
  Layout,
  Protected,
  Workspace,
  DiscoveryLayout,
  roleHome,
} from "./components/layout";
import { Landing } from "./features/landing";
import { ButtonLink, EmptyState } from "./components/ui";
import { useStore } from "./lib/store";
import { LearningProgress, DemoUsers } from "./features/workspace-indexes";
const Auth = lazy(() =>
  import("./features/auth").then((m) => ({ default: m.Auth })),
);
const Dashboard = lazy(() =>
  import("./features/learning").then((m) => ({ default: m.Dashboard })),
);
const Explore = lazy(() =>
  import("./features/learning").then((m) => ({ default: m.Explore })),
);
const Lesson = lazy(() =>
  import("./features/learning").then((m) => ({ default: m.LessonPage })),
);
const Community = lazy(() =>
  import("./features/learning").then((m) => ({ default: m.Community })),
);
const Tutors = lazy(() =>
  import("./features/tutors").then((m) => ({ default: m.Tutors })),
);
const Assistant = lazy(() =>
  import("./features/assistant").then((m) => ({ default: m.Assistant })),
);
const Studio = lazy(() =>
  import("./features/studio").then((m) => ({ default: m.Studio })),
);
const Feedback = lazy(() =>
  import("./features/studio").then((m) => ({ default: m.Feedback })),
);
const SessionRoom = lazy(() =>
  import("./features/session").then((m) => ({ default: m.SessionRoom })),
);
const Sessions = lazy(() =>
  import("./features/session").then((m) => ({ default: m.Sessions })),
);
const Guardian = lazy(() =>
  import("./features/trust").then((m) => ({ default: m.Guardian })),
);
const Champion = lazy(() =>
  import("./features/trust").then((m) => ({ default: m.Champion })),
);
const Admin = lazy(() =>
  import("./features/trust").then((m) => ({ default: m.Admin })),
);
const Settings = lazy(() =>
  import("./features/trust").then((m) => ({ default: m.Settings })),
);
const About = lazy(() =>
  import("./features/trust").then((m) => ({ default: m.About })),
);
export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="page-loading" role="status">
          <span />A little moment…
        </div>
      }
    >
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="login" element={<Auth />} />
          <Route path="onboarding" element={<Auth onboarding />} />
          <Route path="about" element={<About />} />
        </Route>
        <Route element={<DiscoveryLayout />}>
          <Route path="explore" element={<Explore />} />
          <Route path="lesson/:id" element={<Lesson />} />
          <Route path="tutors" element={<Tutors />} />
          <Route path="community" element={<Community />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route
          element={
            <Protected
              roles={["learner", "tutor", "guardian", "champion", "admin"]}
            />
          }
        >
          <Route element={<Workspace />}>
            <Route path="settings" element={<Settings />} />
            <Route element={<Protected roles={["learner"]} />}>
              <Route path="learn" element={<Dashboard />} />
              <Route path="learn/progress" element={<LearningProgress />} />
            </Route>
            <Route element={<Protected roles={["learner", "tutor"]} />}>
              <Route path="assistant" element={<Assistant />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="room/:id" element={<SessionRoom />} />
            </Route>
            <Route element={<Protected roles={["tutor"]} />}>
              <Route path="studio" element={<Studio />} />
              <Route path="studio/feedback" element={<Feedback />} />
            </Route>
            <Route element={<Protected roles={["guardian"]} />}>
              <Route path="guardian" element={<Guardian />} />
            </Route>
            <Route element={<Protected roles={["champion"]} />}>
              <Route path="champion" element={<Champion />} />
            </Route>
            <Route element={<Protected roles={["admin"]} />}>
              <Route path="admin" element={<Admin />} />
              <Route path="admin/users" element={<DemoUsers />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
function NotFound() {
  const { role } = useStore();
  return (
    <div className="container page">
      <EmptyState
        title="A little off the path."
        description="Let’s find our way back to something worth learning."
      >
        <ButtonLink to={role ? roleHome[role] : "/"}>
          {role ? "Back to overview" : "Back to the village"}
        </ButtonLink>
      </EmptyState>
    </div>
  );
}
