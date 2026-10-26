import { Suspense, useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  Navigate,
  useNavigate,
} from "react-router-dom";
import {
  Menu,
  ArrowUpRight,
  Globe2,
  WifiOff,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useWorkspaceIdentity } from "../lib/auth/provider";
import { EmptyState } from "./ui";
import { Brand, ButtonLink, Modal } from "./ui";
import { demoProfiles } from "../data/demo";
import { useStore, languageLabels } from "../lib/store";
import type { Role, Language } from "../domain/types";
import { canAccess } from "../domain/learning";
export { roleHome } from "./workspace-navigation";
import {
  roleHome,
  workspaceNavigation,
  destinationIsActive,
  currentDestination,
  testSafetyDestination,
} from "./workspace-navigation";
export function Layout() {
  const [menu, setMenu] = useState(false);
  const [info, setInfo] = useState(false);
  const { role } = useWorkspaceIdentity();
  const { data, setPreferences, online, storageIssue, message } = useStore();
  const location = useLocation();
  useEffect(() => {
    document.title = "Village Vidya — A little help. A world of possibility.";
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: "instant" });
      document.getElementById("main-content")?.focus({ preventScroll: true });
    } else {
      const t = setTimeout(
        () => document.querySelector(location.hash)?.scrollIntoView(),
        50,
      );
      return () => clearTimeout(t);
    }
  }, [location.pathname, location.hash]);
  const nav = (
    <>
      <NavLink to="/explore" onClick={() => setMenu(false)}>
        Explore
      </NavLink>
      <NavLink to="/tutors" onClick={() => setMenu(false)}>
        Find tutors
      </NavLink>
      <Link to="/#how-it-works" onClick={() => setMenu(false)}>
        How it works
      </Link>
      <NavLink to="/about" onClick={() => setMenu(false)}>
        Our story
      </NavLink>
    </>
  );
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" aria-label="Village Vidya home">
            <Brand />
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {nav}
          </nav>
          <div className="header-actions">
            <label className="language-select">
              <Globe2 size={16} />
              <select
                aria-label="Interface language"
                value={data.language}
                onChange={(e) =>
                  setPreferences({ language: e.target.value as Language })
                }
              >
                {(["English", "हिन्दी", "मराठी", "తెలుగు"] as const).map(
                  (l) => (
                    <option key={l}>{l}</option>
                  ),
                )}
              </select>
            </label>
            {role ? (
              <ButtonLink to={roleHome[role]} variant="ink">
                My workspace <ArrowUpRight size={15} />
              </ButtonLink>
            ) : (
              <>
                <Link to="/login" className="login-link">
                  Log in
                </Link>
                <ButtonLink to="/onboarding" variant="ink">
                  Get started <ArrowUpRight size={15} />
                </ButtonLink>
              </>
            )}
            <button
              className="icon-button mobile-toggle"
              onClick={() => setMenu(true)}
              aria-label="Open navigation"
              aria-expanded={menu}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>
      {!online && (
        <div className="offline-banner" role="status">
          <WifiOff size={16} /> You’re offline. Previously loaded lessons and
          local practice are available.
        </div>
      )}
      {storageIssue && (
        <div className="offline-banner" role="alert">
          Browser storage is unavailable. Your changes will last for this visit
          only.
        </div>
      )}
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-main">
          <div>
            <Link to="/" aria-label="Village Vidya home">
              <Brand />
            </Link>
            <p>A little help. A world of possibility.</p>
            <span className="footer-location">
              Made for the places big dreams call home.
            </span>
          </div>
          <div className="footer-links">
            <div>
              <span>KEEP EXPLORING</span>
              <Link to="/explore">Learning library</Link>
              <Link to="/tutors">Meet your peers</Link>
              <Link to="/community">Knowledge wall</Link>
            </div>
            <div>
              <span>BUILT ON TRUST</span>
              <Link to="/about#safety">Safety & privacy</Link>
              <Link to="/onboarding?role=tutor">Become a tutor</Link>
              <button onClick={() => setInfo(true)}>About this demo</button>
            </div>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} Village Vidya · Learning belongs to
            everyone.
          </span>
          <button onClick={() => setInfo(true)}>
            <span className="status-dot" /> An independent student project{" "}
            <ArrowUpRight size={13} />
          </button>
        </div>
      </footer>
      <Modal
        open={menu}
        onClose={() => setMenu(false)}
        title="A world to discover"
      >
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {nav}
          {role && (
            <>
              <Link to={roleHome[role]} onClick={() => setMenu(false)}>
                My workspace
              </Link>
              {["learner", "tutor"].includes(role) && (
                <>
                  <Link to="/sessions" onClick={() => setMenu(false)}>
                    My sessions
                  </Link>
                  <Link to="/assistant" onClick={() => setMenu(false)}>
                    Ask a doubt
                  </Link>
                </>
              )}
              <Link to="/settings" onClick={() => setMenu(false)}>
                Preferences
              </Link>
            </>
          )}
          <Link to="/login" onClick={() => setMenu(false)}>
            Choose a demo profile <ArrowUpRight size={19} />
          </Link>
        </nav>
      </Modal>
      <Modal
        open={info}
        onClose={() => setInfo(false)}
        title="A thoughtful, fictional demo"
      >
        <div className="prose">
          <p>
            Village Vidya is a college project. Every learner, tutor,
            verification, and session shown here is fictional.
          </p>
          <p>
            Matching calculations, quizzes, bookmarks, ELIC events, and local
            progress work in this browser. Practice conversations and Co-Teacher
            feedback use curated samples. No real SMS, identity verification, AI
            analysis, or cross-device sessions are connected.
          </p>
          <p>
            Real registration is closed. Please use only the provided fictional
            profiles. Session messages and notes stay in memory and are
            discarded when you leave or reload.
          </p>
          <ButtonLink to="/about" variant="outline">
            Read the implementation notes <ArrowUpRight size={16} />
          </ButtonLink>
        </div>
      </Modal>
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </>
  );
}
export function Protected({ roles }: { roles: Role[] }) {
  const { role, real, auth } = useWorkspaceIdentity();
  if (auth.status === "loading")
    return (
      <div className="page-loading" role="status">
        Verifying your account…
      </div>
    );
  if (real && auth.recovery) return <Navigate to="/account/recovery" replace />;
  if (real && auth.status !== "authenticated")
    return <Navigate to="/account/sign-in" replace />;
  if (real && !auth.account?.roles.some((r) => roles.includes(r)))
    return (
      <div className="container page">
        <EmptyState
          title="This workspace requires another role."
          description="Your account has no assigned access to this destination."
        >
          <ButtonLink to={roleHome[role ?? "learner"]}>
            Return to your workspace
          </ButtonLink>
        </EmptyState>
      </div>
    );
  return canAccess(role, roles) ||
    (real && auth.account?.roles.some((r) => roles.includes(r))) ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace />
  );
}
// Public discovery keeps its URLs; signed-in demo profiles retain their workspace.
export function DiscoveryLayout() {
  const { role, real, auth } = useWorkspaceIdentity();
  if (real && auth.status === "loading")
    return (
      <div className="page-loading" role="status">
        Verifying your account…
      </div>
    );
  if (real && auth.recovery) return <Navigate to="/account/recovery" replace />;
  if (real && auth.status !== "authenticated")
    return <Navigate to="/account/sign-in" replace />;
  return role ? <Workspace /> : <Layout />;
}
export function Workspace() {
  const { role, real, auth } = useWorkspaceIdentity();
  const { data, online, logout, storageIssue, message } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const profile = {
    ...demoProfiles[role ?? "learner"],
    ...(real && auth.account
      ? { name: auth.account.profile.display_name }
      : {}),
  };
  const language = real
    ? (auth.account?.profile.preferred_language ?? "English")
    : data.language;
  const translated = languageLabels[language];
  const existingTranslations: Record<string, string> = {
    "/learn": translated.home,
    "/explore": translated.learn,
    "/tutors": translated.tutors,
  };
  const destinations = [
    ...workspaceNavigation[role ?? "learner"],
    ...(real ? [testSafetyDestination] : []),
  ].map((item) =>
    role === "learner" &&
    language !== "English" &&
    existingTranslations[item.to]
      ? { ...item, label: existingTranslations[item.to] }
      : item,
  );
  const active =
    real && location.pathname === "/safety"
      ? testSafetyDestination
      : currentDestination(role ?? "learner", location.pathname, location.hash);
  const title = location.pathname.startsWith("/lesson/")
    ? "Lesson"
    : location.pathname.startsWith("/room/")
      ? "Practice room"
      : (destinations.find((item) => item.to === active?.to)?.label ??
        {
          "/explore": "Learning Library",
          "/tutors": "Find Tutors",
          "/community": "Community",
          "/assistant": "Ask AI",
        }[location.pathname] ??
        "Page not found");
  useEffect(() => {
    document.title = `${title} · Village Vidya`;
  }, [location.pathname, location.hash, title]);
  function closeMenu() {
    setMenu(false);
    menuButton.current?.focus();
  }
  async function leave() {
    closeMenu();
    if (real) {
      try {
        await auth.signOut();
      } catch {
        /* Provider keeps the revocation error visible on sign-in. */
      } finally {
        navigate("/account/sign-in");
      }
    } else {
      logout();
      navigate("/login");
    }
  }
  function navigation(mobile = false) {
    return (
      <nav
        aria-label={
          mobile ? "Mobile workspace navigation" : "Workspace navigation"
        }
        className="workspace-navigation"
      >
        {[...new Set(destinations.map((item) => item.group))].map((group) => (
          <div className="workspace-nav-group" key={group}>
            <span className="workspace-group-label">{group}</span>
            {destinations
              .filter((item) => item.group === group)
              .map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={mobile ? closeMenu : undefined}
                  className={
                    destinationIsActive(to, location.pathname, location.hash)
                      ? "active"
                      : undefined
                  }
                  aria-current={
                    destinationIsActive(to, location.pathname, location.hash)
                      ? "page"
                      : undefined
                  }
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </Link>
              ))}
          </div>
        ))}
      </nav>
    );
  }
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="app-sidebar" aria-label={`${profile.label} workspace`}>
        <Link
          to={roleHome[role ?? "learner"]}
          aria-label="Workspace home"
          className="workspace-brand"
        >
          <Brand />
        </Link>
        <div className="workspace-role">{profile.label} workspace</div>
        {navigation()}
        <div className="workspace-account">
          <div className="workspace-profile">
            <span>{profile.name[0]}</span>
            <div>
              <strong>{profile.name}</strong>
              <small>{real ? "Adult test account" : "Fictional profile"}</small>
            </div>
          </div>
          <Link to="/">
            Public website <ArrowUpRight size={15} />
          </Link>
          <button onClick={leave}>
            <LogOut size={17} />
            {real ? "Sign out" : "Leave demo"}
          </button>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-header">
          <button
            ref={menuButton}
            className="icon-button workspace-menu-toggle"
            onClick={() => setMenu(true)}
            aria-label="Open workspace navigation"
            aria-expanded={menu}
            aria-haspopup="dialog"
          >
            <Menu size={22} />
          </button>
          <div className="app-header-context">
            <span>{profile.label} workspace</span>
            <strong>{title}</strong>
          </div>
          <span className="workspace-demo-status">
            <span className={online ? "status-dot" : "status-dot offline"} />
            {real ? "Authenticated account" : "Fictional demo"}
            <span className="workspace-connection">
              {" "}
              ·{" "}
              {real
                ? "adult test access"
                : online
                  ? "on this device"
                  : "offline"}
            </span>
          </span>
        </header>
        {!online && (
          <div className="offline-banner" role="status">
            <WifiOff size={16} />
            {real
              ? "You’re offline. Account access requires a connection; private account data is not cached for offline use."
              : "You’re offline. Previously loaded lessons and local practice are available."}
          </div>
        )}
        {storageIssue && !real && (
          <div className="offline-banner" role="alert">
            Browser storage is unavailable. Changes last for this visit only.
          </div>
        )}
        <main id="main-content" className="app-content" tabIndex={-1}>
          <nav className="workspace-breadcrumbs" aria-label="Breadcrumb">
            <Link to={roleHome[role ?? "learner"]}>Workspace</Link>
            <ChevronRight size={13} aria-hidden="true" />
            {location.pathname.startsWith("/lesson/") && (
              <>
                <Link to="/explore">
                  {role === "admin" ? "Curriculum" : "My Learning"}
                </Link>
                <ChevronRight size={13} aria-hidden="true" />
              </>
            )}
            {location.hash && active && (
              <>
                <Link to={roleHome[role ?? "learner"]}>Overview</Link>
                <ChevronRight size={13} aria-hidden="true" />
              </>
            )}
            <span aria-current="page">{title}</span>
          </nav>
          <Suspense
            fallback={
              <div className="page-loading" role="status">
                <span />
                Loading your workspace…
              </div>
            }
          >
            <WorkspaceContent />
          </Suspense>
        </main>
      </div>
      <Modal
        open={menu}
        onClose={closeMenu}
        title={`${profile.label} workspace`}
      >
        {navigation(true)}
        <div className="workspace-mobile-account">
          <Link to="/" onClick={closeMenu}>
            Public website <ArrowUpRight size={16} />
          </Link>
          <button onClick={leave}>
            <LogOut size={17} />
            {real ? "Sign out" : "Leave demo"}
          </button>
        </div>
        <p className="small muted">
          {profile.name} ·{" "}
          {real
            ? "authenticated adult test account"
            : "fictional profile · local demo"}
        </p>
      </Modal>
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </div>
  );
}

// Commit focus only after lazy page content is ready, including direct hash links.
function WorkspaceContent() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const section = document.getElementById(location.hash.slice(1));
      section?.scrollIntoView({ behavior: "instant", block: "start" });
      section?.focus({ preventScroll: true });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
      document.getElementById("main-content")?.focus({ preventScroll: true });
    }
  }, [location.pathname, location.hash]);
  return <Outlet />;
}
