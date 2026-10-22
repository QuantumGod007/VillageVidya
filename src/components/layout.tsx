import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  Menu,
  ArrowUpRight,
  Globe2,
  WifiOff,
  LayoutDashboard,
  BookOpen,
  Users,
  Sparkles,
  CalendarDays,
  Bookmark,
  LogOut,
  ShieldCheck,
  Settings2,
  Heart,
  Bell,
  GraduationCap,
} from "lucide-react";
import { Brand, ButtonLink, Modal } from "./ui";
import { demoProfiles } from "../data/demo";
import { useStore, languageLabels } from "../lib/store";
import type { Role, Language } from "../domain/types";
import { canAccess } from "../domain/learning";
export const roleHome: Record<Role, string> = {
  learner: "/learn",
  tutor: "/studio",
  guardian: "/guardian",
  champion: "/champion",
  admin: "/admin",
};
export function Layout() {
  const [menu, setMenu] = useState(false);
  const [info, setInfo] = useState(false);
  const { role, data, setPreferences, online, storageIssue, message } =
    useStore();
  const location = useLocation();
  useEffect(() => {
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
  const { role } = useStore();
  return canAccess(role, roles) ? <Outlet /> : <Navigate to="/login" replace />;
}
export function Workspace() {
  const { role, online, logout, data } = useStore();
  const [notifications, setNotifications] = useState(false);
  const profile = demoProfiles[role ?? "learner"];
  const t = languageLabels[data.language];
  const learnerNav = [
    { to: "/learn", label: t.home, icon: LayoutDashboard },
    { to: "/explore", label: t.learn, icon: BookOpen },
    { to: "/tutors", label: t.tutors, icon: Users },
    { to: "/assistant", label: "Ask a doubt", icon: Sparkles },
    { to: "/sessions", label: "My sessions", icon: CalendarDays },
    { to: "/community", label: "Knowledge wall", icon: Bookmark },
  ];
  const otherNav =
    role === "tutor"
      ? [
          { to: "/studio", label: "Tutor overview", icon: LayoutDashboard },
          { to: "/sessions", label: "My sessions", icon: CalendarDays },
          { to: "/studio/feedback", label: "Co-Teacher", icon: Sparkles },
          { to: "/community", label: "Knowledge wall", icon: BookOpen },
        ]
      : [
          {
            to: roleHome[role ?? "learner"],
            label:
              role === "guardian"
                ? "Learning together"
                : role === "champion"
                  ? "Trust dashboard"
                  : "Platform overview",
            icon: role === "guardian" ? Heart : ShieldCheck,
          },
          { to: "/community", label: "Knowledge wall", icon: BookOpen },
        ];
  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="workspace-label">
          <GraduationCap size={17} />
          {profile.label} space
        </div>
        <nav aria-label="Workspace navigation">
          {(role === "learner" ? learnerNav : otherNav).map(
            ({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end>
                <Icon size={19} />
                {label}
              </NavLink>
            ),
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className={online ? "status-dot" : "status-dot offline"} />
            {online ? "Online · local demo" : "Offline · on this device"}
            <p>Your next small step matters.</p>
          </div>
          <NavLink to="/settings">
            <Settings2 size={18} /> Preferences
          </NavLink>
          <button onClick={logout}>
            <LogOut size={18} /> Leave demo
          </button>
          <div className="profile-chip">
            <span>{profile.name[0]}</span>
            <div>
              <strong>{profile.name}</strong>
              <small>Fictional {profile.label.toLowerCase()}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <div className="workspace-topline">
          <span>
            <span className="status-dot" /> Fictional demo · your browser, your
            pace
          </span>
          <button
            className="notification-button"
            onClick={() => setNotifications(true)}
            aria-label="View notifications"
          >
            <Bell size={18} />
            <span className="notification-dot" />
          </button>
        </div>
        <Outlet />
      </div>
      <Modal
        open={notifications}
        onClose={() => setNotifications(false)}
        title="A little nudge"
      >
        <div className="notification-item">
          <Sparkles size={21} />
          <div>
            <strong>Your next aha is waiting</strong>
            <p>Continue a lesson or ask a peer to explain it another way.</p>
          </div>
        </div>
        <p className="small muted">
          In-app demo notification only. Push notifications and SMS are not
          connected.
        </p>
      </Modal>
    </div>
  );
}
