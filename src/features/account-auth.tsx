import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Button, ButtonLink, Eyebrow } from "../components/ui";
import { useAccount } from "../lib/auth/provider";
import { useStore } from "../lib/store";
import { roleHome } from "../components/workspace-navigation";
export function AccountAuth({ recovery = false }: { recovery?: boolean }) {
  const auth = useAccount();
  const demo = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (auth.account && !recovery && !auth.recovery)
      navigate(roleHome[auth.account.roles[0]], { replace: true });
    if (auth.recovery && !recovery)
      navigate("/account/recovery", { replace: true });
  }, [auth.account, auth.recovery, navigate, recovery]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (recovery) {
        await auth.updatePassword(password);
        setPassword("");
        setMessage(
          "Your password has been updated and your sessions signed out. Sign in with your new password.",
        );
      } else if (forgot) {
        await auth.recover(email);
        setMessage(
          "If this is an eligible account, check its email for a recovery link. Local testing mail is available in the local mail inbox. Delivery requires a configured mail service.",
        );
      } else {
        demo.logout();
        await auth.signIn(email, password);
        setPassword("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const loading = busy || auth.status === "loading";
  const configured = !!auth.access;
  return (
    <div className="container auth-page">
      <Link to="/login" className="back-link">
        <ArrowLeft size={16} />
        Fictional demo
      </Link>
      <div className="auth-layout">
        <div className="auth-visual">
          <Eyebrow>ROOTED IN TRUST</Eyebrow>
          <h2>
            A familiar
            <br />
            place.
            <br />
            <em>
              Your own
              <br />
              account.
            </em>
          </h2>
          <div className="auth-illustration">
            <LockKeyhole size={84} strokeWidth={0.8} />
            <p>Private by design. Clear about what’s ready.</p>
          </div>
          <div className="auth-visual-footer">
            <span>VILLAGE VIDYA</span>
            <span>ADULT TEST ACCESS ↗</span>
          </div>
        </div>
        <div className="auth-content">
          <Eyebrow>AUTHENTICATED ACCOUNT</Eyebrow>
          <h1>
            {recovery
              ? "A fresh start."
              : forgot
                ? "Find your way back."
                : "Welcome back."}
          </h1>
          <p className="muted">
            {recovery
              ? "Choose a new password using the recovery link sent to your account."
              : forgot
                ? "Enter the email associated with your provisioned account."
                : "Sign in with your provisioned adult test account. Your role is assigned securely by an administrator."}
          </p>
          <div className="demo-notice">
            <ShieldCheck size={17} />
            <span>Real identity · separate from the fictional demo</span>
          </div>
          {!configured ? (
            <div className="registration-closed">
              <LockKeyhole size={26} />
              <h2>Account sign-in isn’t configured here.</h2>
              <p>
                {auth.message ||
                  "This installation currently offers the fictional demo. A local Supabase stack and provisioned adult account are required for real sign-in."}
              </p>
              <ButtonLink to="/login" variant="outline">
                Explore the demo <ArrowUpRight size={16} />
              </ButtonLink>
            </div>
          ) : (
            <>
              {(error || auth.message) && (
                <p className="field-error" role="alert">
                  {error || auth.message}
                </p>
              )}
              {loading && <p role="status">Verifying your session…</p>}
              {message && (
                <p className="account-feedback" role="status">
                  {message}
                </p>
              )}
              {recovery && !auth.recovery && !loading && !message ? (
                <div className="registration-closed">
                  <h2>A valid recovery link is needed.</h2>
                  <p>
                    This link may have expired, already been used, or been
                    opened in a different browser. Request a new link from
                    sign-in.
                  </p>
                  <ButtonLink to="/account/sign-in" variant="outline">
                    Back to sign-in
                  </ButtonLink>
                </div>
              ) : !message || !recovery ? (
                <form className="onboarding-form" onSubmit={submit}>
                  {!recovery && (
                    <label className="field">
                      Email address
                      <input
                        type="email"
                        autoComplete="username"
                        required
                        maxLength={254}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                      />
                    </label>
                  )}
                  {!forgot && (
                    <label className="field">
                      {recovery ? "New password" : "Password"}
                      <input
                        type="password"
                        autoComplete={
                          recovery ? "new-password" : "current-password"
                        }
                        required
                        minLength={recovery ? 12 : 1}
                        maxLength={128}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                      />
                      {recovery && (
                        <span className="small muted">
                          Use at least 12 characters.
                        </span>
                      )}
                    </label>
                  )}
                  <Button
                    type="submit"
                    className="full-width"
                    disabled={loading}
                  >
                    {loading
                      ? "Please wait…"
                      : recovery
                        ? "Update password & sign out"
                        : forgot
                          ? "Send recovery link"
                          : "Sign in securely"}
                    <ArrowUpRight size={17} />
                  </Button>
                </form>
              ) : (
                <ButtonLink to="/account/sign-in">Sign in</ButtonLink>
              )}
              {!recovery && (
                <button
                  className="text-link auth-real-link"
                  disabled={loading}
                  onClick={() => {
                    setForgot(!forgot);
                    setError("");
                    setMessage("");
                  }}
                >
                  {forgot ? "Back to sign-in" : "Forgot your password?"}
                </button>
              )}
              {(auth.status === "error" || auth.account) && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await auth.signOut();
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Could not sign out.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Sign out all sessions
                </Button>
              )}
            </>
          )}
          <p className="auth-fine-print">
            Real registration and tutoring participation remain closed. No SMS
            verification, guardian approval or tutor verification is granted
            here.
          </p>
        </div>
      </div>
    </div>
  );
}
