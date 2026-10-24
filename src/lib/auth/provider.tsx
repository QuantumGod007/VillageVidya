import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createDataAccess } from "../data-access";
import { verifiedAccount, type AccountIdentity } from "./account";
import { useStore } from "../store";
import { useLocation } from "react-router-dom";
import { roleHome } from "../../components/workspace-navigation";
import type { Role } from "../../domain/types";
export type RealAccess = Extract<
  ReturnType<typeof createDataAccess>,
  { mode: "supabase" }
>;
type Status = "disabled" | "loading" | "anonymous" | "authenticated" | "error";
interface AuthState {
  status: Status;
  account: AccountIdentity | null;
  message: string;
  recovery: boolean;
  preferAccount: boolean;
}
interface AccountContext extends AuthState {
  access: RealAccess | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  enterDemo(): Promise<void>;
  recover(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  refresh(): Promise<void>;
}
const empty: AuthState = {
  status: "disabled",
  account: null,
  message: "",
  recovery: false,
  preferAccount: false,
};
const unavailable = async () => {
  throw new Error("Real sign-in is not configured on this installation.");
};
const fallback: AccountContext = {
  ...empty,
  access: null,
  signIn: unavailable,
  signOut: unavailable,
  enterDemo: async () => {},
  recover: unavailable,
  updatePassword: unavailable,
  refresh: unavailable,
};
const Context = createContext<AccountContext>(fallback);
export function AccountProvider({
  children,
  access: injected,
}: {
  children: ReactNode;
  access?: RealAccess | null;
}) {
  const configuration = useMemo(() => {
    if (injected !== undefined) return { access: injected, error: "" };
    if (import.meta.env.VITE_APP_MODE !== "supabase")
      return { access: null, error: "" };
    try {
      const result = createDataAccess({
        mode: "supabase",
        url: import.meta.env.VITE_SUPABASE_URL,
        publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      });
      return { access: result.mode === "supabase" ? result : null, error: "" };
    } catch {
      return {
        access: null,
        error:
          "Real sign-in configuration is invalid. Contact the administrator; the fictional demo is still available.",
      };
    }
  }, [injected]);
  const access = configuration.access;
  const [state, setState] = useState<AuthState>({
    ...empty,
    status: access ? "loading" : configuration.error ? "error" : "disabled",
    message: configuration.error,
  });
  const generation = useRef(0);
  const recovery = useRef(false);
  const signingOut = useRef(false);
  const verify = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    if (!access) return;
    let disposed = false;
    async function validate() {
      const request = ++generation.current;
      setState((p) => ({ ...p, status: "loading", account: null }));
      try {
        const session = await access!.client.auth.getSession();
        if (session.error) throw session.error;
        if (!session.data.session) {
          if (!disposed && request === generation.current)
            setState((p) => ({
              ...p,
              status: "anonymous",
              account: null,
              recovery: false,
            }));
          return;
        }
        const account = await verifiedAccount(access!.client);
        if (!disposed && request === generation.current)
          setState({
            status: "authenticated",
            account,
            message: "",
            recovery: recovery.current,
            preferAccount: true,
          });
      } catch (error) {
        if (!disposed && request === generation.current)
          setState({
            status: "error",
            account: null,
            recovery: false,
            preferAccount: true,
            message:
              error instanceof Error
                ? error.message
                : "We couldn’t verify your account. Please sign in again.",
          });
      }
    }
    verify.current = validate;
    const {
      data: { subscription },
    } = access.client.auth.onAuthStateChange((event, session) => {
      if (disposed) return;
      if (event === "PASSWORD_RECOVERY") recovery.current = true;
      if (event === "SIGNED_OUT") {
        ++generation.current;
        recovery.current = false;
        setState((p) => ({
          ...p,
          status: "anonymous",
          account: null,
          recovery: false,
          message: signingOut.current
            ? ""
            : "Your session ended. Please sign in again.",
        }));
      } else {
        // Do not await Auth or database calls inside Supabase's auth lock.
        if (session)
          setState((p) => ({
            ...p,
            status: "loading",
            account: null,
            preferAccount: true,
          }));
        setTimeout(() => {
          if (!disposed) void validate();
        }, 0);
      }
    });
    void validate();
    const check = () => {
      if (document.visibilityState !== "hidden") void validate();
    };
    const timer = setInterval(check, 60_000);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    return () => {
      disposed = true;
      subscription.unsubscribe();
      clearInterval(timer);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
    };
  }, [access]);
  async function signOut() {
    if (!access) return;
    signingOut.current = true;
    ++generation.current;
    setState((p) => ({
      ...p,
      status: "loading",
      account: null,
      preferAccount: true,
    }));
    try {
      const { error } = await access.client.auth.signOut({ scope: "global" });
      if (error)
        throw new Error(
          "Sign-out could not reach the server. Reconnect and retry to revoke your sessions.",
        );
      recovery.current = false;
      setState({ ...empty, status: "anonymous", preferAccount: true });
    } catch (error) {
      setState((p) => ({
        ...p,
        status: "error",
        message: error instanceof Error ? error.message : "Could not sign out.",
      }));
      throw error;
    } finally {
      signingOut.current = false;
    }
  }
  const value: AccountContext = {
    ...state,
    access,
    async signIn(email, password) {
      if (!access) return unavailable();
      ++generation.current;
      setState({ ...empty, status: "loading", preferAccount: true });
      recovery.current = false;
      try {
        const { error } = await access.client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error)
          throw new Error(
            error.code === "email_not_confirmed"
              ? "Confirm your email before signing in."
              : "Unable to sign in. Check your email and password, or try again when connected.",
          );
        await verify.current();
      } catch (error) {
        ++generation.current;
        const message =
          error instanceof Error &&
          error.message.startsWith("Confirm your email")
            ? error.message
            : "Unable to sign in. Check your email and password, or try again when connected.";
        setState({
          ...empty,
          status: "anonymous",
          message,
          preferAccount: true,
        });
        throw new Error(message);
      }
    },
    signOut,
    async enterDemo() {
      if (access) await signOut();
      setState((p) => ({ ...p, preferAccount: false, message: "" }));
    },
    async recover(email) {
      if (!access) return unavailable();
      const { error } = await access.client.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/account/recovery` },
      );
      if (error)
        throw new Error(
          "Recovery is unavailable. Please try again later or contact the account administrator.",
        );
    },
    async updatePassword(password) {
      if (!access || !recovery.current || state.status !== "authenticated")
        throw new Error("Open a valid recovery link first.");
      if (password.length < 12) throw new Error("Use at least 12 characters.");
      const { error } = await access.client.auth.updateUser({ password });
      if (error)
        throw new Error(
          "The password could not be updated. Request a fresh recovery link.",
        );
      await signOut();
    },
    refresh: () => verify.current(),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useAccount = () => useContext(Context);
export function useWorkspaceIdentity() {
  const { pathname } = useLocation();
  const demo = useStore();
  const auth = useAccount();
  const real =
    auth.preferAccount ||
    auth.status === "loading" ||
    auth.status === "authenticated";
  const role: Role | null = real
    ? (auth.account?.roles.find(
        (r) =>
          pathname === roleHome[r] || pathname.startsWith(`${roleHome[r]}/`),
      ) ??
      auth.account?.roles[0] ??
      null)
    : demo.role;
  return { role, real, auth };
}
