import React, { Component, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "./styles.css";
import { StoreProvider, useStore } from "./lib/store";
import { AccountProvider } from "./lib/auth/provider";
import { AppRoutes } from "./app-routes";
import { EmptyState } from "./components/ui";
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
            <AppRoutes />
          </ErrorBoundary>
        </BrowserRouter>
      </div>
    </MotionConfig>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StoreProvider>
      <AccountProvider>
        <App />
      </AccountProvider>
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
