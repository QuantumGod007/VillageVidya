import React, { Component, Suspense, lazy, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MotionConfig } from "motion/react";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "./styles.css";
import { StoreProvider, useStore } from "./lib/store";
import { Layout, Protected, Workspace } from "./components/layout";
import { Landing } from "./features/landing";
import { ButtonLink, EmptyState } from "./components/ui";
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
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="container page">
        <EmptyState
          title="A little interruption."
          description="The page couldn’t be loaded. Your saved demo progress is still on this device."
        >
          <button
            className="button button-primary"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </EmptyState>
      </div>
    ) : (
      this.props.children
    );
  }
}
function App() {
  const { data } = useStore();
  return (
    <MotionConfig reducedMotion={data.lowData ? "always" : "user"}>
      <div data-low-data={data.lowData}>
        <BrowserRouter>
          <ErrorBoundary>
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
                  <Route path="explore" element={<Explore />} />
                  <Route path="lesson/:id" element={<Lesson />} />
                  <Route path="tutors" element={<Tutors />} />
                  <Route path="community" element={<Community />} />
                  <Route path="about" element={<About />} />
                  <Route
                    element={
                      <Protected
                        roles={[
                          "learner",
                          "tutor",
                          "guardian",
                          "champion",
                          "admin",
                        ]}
                      />
                    }
                  >
                    <Route element={<Workspace />}>
                      <Route path="settings" element={<Settings />} />
                      <Route element={<Protected roles={["learner"]} />}>
                        <Route path="learn" element={<Dashboard />} />
                      </Route>
                      <Route
                        element={<Protected roles={["learner", "tutor"]} />}
                      >
                        <Route path="assistant" element={<Assistant />} />
                        <Route path="sessions" element={<Sessions />} />
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
                      </Route>
                    </Route>
                    <Route element={<Protected roles={["learner", "tutor"]} />}>
                      <Route path="room/:id" element={<SessionRoom />} />
                    </Route>
                  </Route>
                  <Route
                    path="*"
                    element={
                      <div className="container page">
                        <EmptyState
                          title="A little off the path."
                          description="Let’s find our way back to something worth learning."
                        >
                          <ButtonLink to="/">Back to the village</ButtonLink>
                        </EmptyState>
                      </div>
                    }
                  />
                </Route>
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </div>
    </MotionConfig>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </React.StrictMode>,
);
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* Offline availability is optional; never claim a successful install. */
    });
  });
}
