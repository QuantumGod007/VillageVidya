import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import {
  createClient,
  type AuthChangeEvent,
  type Session,
  type User,
} from "@supabase/supabase-js";
import type { Database } from "../src/lib/data-access/database.types";
import type { Role } from "../src/domain/types";
import { AccountProvider, type RealAccess } from "../src/lib/auth/provider";
import { verifiedAccount } from "../src/lib/auth/account";
import { AppRoutes } from "../src/app-routes";
import { StoreProvider } from "../src/lib/store";
const id = "00000000-0000-0000-0000-000000000001";
function setup(role: Role = "tutor", restored = true) {
  const user = {
    id,
    email: "adult@example.invalid",
    email_confirmed_at: "2026-10-24T00:00:00Z",
    app_metadata: {},
    user_metadata: { role: "admin" },
    aud: "authenticated",
    created_at: "2026-10-24T00:00:00Z",
  } as User;
  const session: Session = {
    access_token: "test-access",
    refresh_token: "test-refresh",
    expires_in: 900,
    expires_at: Date.now() / 1000 + 900,
    token_type: "bearer",
    user,
  };
  let current: Session | null = restored ? session : null;
  let enabled = true;
  const listeners = new Set<
    (event: AuthChangeEvent, session: Session | null) => void
  >();
  const data: Record<string, unknown> = {
    profiles: {
      id,
      display_name: "Adult account owner",
      preferred_language: "English",
      created_at: "",
      updated_at: "",
    },
    user_roles: [{ role }],
    adult_test_accounts: { enabled: true },
    learner_profiles:
      role === "learner"
        ? {
            user_id: id,
            required_role: "learner",
            created_at: "",
            updated_at: "",
          }
        : null,
    tutor_profiles:
      role === "tutor"
        ? {
            user_id: id,
            required_role: "tutor",
            academic_grade: 12,
            bio: "",
            teaching_skill_score: null,
            completed_sessions: 0,
            created_at: "",
            updated_at: "",
          }
        : null,
    guardian_relationships: [],
  };
  const fetcher: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const table = new URL(request.url).pathname.split("/").at(-1)!;
    return new Response(
      JSON.stringify(
        table === "adult_test_accounts" ? { enabled } : data[table],
      ),
      { headers: { "Content-Type": "application/json" } },
    );
  };
  const client = createClient<Database>(
    "https://test.supabase.co",
    "sb_publishable_test_auth_public_key",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: crypto.randomUUID(),
      },
      global: { fetch: fetcher },
    },
  );
  vi.spyOn(client.auth, "getSession").mockImplementation(async () =>
    current
      ? { data: { session: current }, error: null }
      : { data: { session: null }, error: null },
  );
  vi.spyOn(client.auth, "getUser").mockImplementation(async () => ({
    data: { user },
    error: null,
  }));
  vi.spyOn(client.auth, "onAuthStateChange").mockImplementation((callback) => {
    listeners.add(callback);
    return {
      data: {
        subscription: {
          id: "fixture",
          callback,
          unsubscribe: () => {
            listeners.delete(callback);
          },
        },
      },
    };
  });
  vi.spyOn(client.auth, "signInWithPassword").mockImplementation(async () => {
    current = session;
    listeners.forEach((fn) => fn("SIGNED_IN", session));
    return { data: { user, session }, error: null };
  });
  vi.spyOn(client.auth, "signOut").mockImplementation(async () => {
    current = null;
    listeners.forEach((fn) => fn("SIGNED_OUT", null));
    return { error: null };
  });
  vi.spyOn(client.auth, "resetPasswordForEmail").mockResolvedValue({
    data: {},
    error: null,
  });
  vi.spyOn(client.auth, "updateUser").mockResolvedValue({
    data: { user },
    error: null,
  });
  const access: RealAccess = {
    mode: "supabase",
    client,
    curriculum: {
      load: vi.fn().mockResolvedValue({
        boards: [],
        grades: [],
        subjects: [],
        chapters: [],
        lessons: [],
        assessments: [],
      }),
    },
    learner: {
      progress: vi.fn().mockResolvedValue([]),
      bookmarks: vi.fn().mockResolvedValue([]),
      attempts: vi.fn().mockResolvedValue([]),
      setBookmark: vi.fn(),
      enroll: vi.fn(),
    },
  };
  return {
    access,
    data,
    session,
    emit: (event: AuthChangeEvent, value: Session | null = session) => {
      current = value;
      listeners.forEach((fn) => fn(event, value));
    },
    disable: () => {
      enabled = false;
    },
  };
}
function open(access: RealAccess, route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <StoreProvider>
        <AccountProvider access={access}>
          <AppRoutes />
        </AccountProvider>
      </StoreProvider>
    </MemoryRouter>,
  );
}
describe("verified account and demo boundary (mocked transport; real API coverage in auth:test)", () => {
  it.each(["learner", "tutor", "guardian", "champion", "admin"] as const)(
    "restores trusted %s identity and keeps fictional content out",
    async (role) => {
      const { access } = setup(role);
      const paths = {
        learner: "/learn",
        tutor: "/studio",
        guardian: "/guardian",
        champion: "/champion",
        admin: "/admin",
      };
      open(access, paths[role]);
      expect(
        await screen.findByRole("heading", {
          name: "Welcome, Adult account owner.",
        }),
      ).toBeInTheDocument();
      const nav = screen.getByRole("navigation", {
        name: "Workspace navigation",
      });
      expect(
        within(nav).getByRole("link", { name: "Overview" }),
      ).toHaveAttribute("aria-current", "page");
      expect(screen.queryByText("Aarav")).not.toBeInTheDocument();
      expect(screen.queryByText("Aditi")).not.toBeInTheDocument();
      expect(
        await screen.findByRole("button", { name: "Sign out" }),
      ).toBeInTheDocument();
    },
  );
  it("uses database roles and rejects user metadata escalation", async () => {
    const { access } = setup("learner");
    expect((await verifiedAccount(access.client)).roles).toEqual(["learner"]);
    open(access, "/admin/users");
    expect(
      await screen.findByRole("heading", {
        name: "This workspace requires another role.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Server-controlled user administration"),
    ).not.toBeInTheDocument();
  });
  it("rejects disabled adult access and incomplete role profiles", async () => {
    const f = setup("tutor");
    f.disable();
    await expect(verifiedAccount(f.access.client)).rejects.toThrow(/revoked/);
    const incomplete = setup("tutor");
    incomplete.data.tutor_profiles = null;
    await expect(verifiedAccount(incomplete.access.client)).rejects.toThrow(
      /incomplete/,
    );
  });
  it("signs in without a browser-selected UUID or role and signs out globally", async () => {
    const user = userEvent.setup();
    const { access } = setup("tutor", false);
    sessionStorage.setItem(
      "vv-demo-role",
      JSON.stringify({ role: "admin", expires: Date.now() + 900000 }),
    );
    open(access, "/account/sign-in");
    await user.type(
      await screen.findByLabelText("Email address"),
      "adult@example.invalid",
    );
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in securely" }));
    expect(
      await screen.findByRole("heading", {
        name: "Welcome, Adult account owner.",
      }),
    ).toBeInTheDocument();
    expect(access.client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "adult@example.invalid",
      password: "correct-password",
    });
    expect(sessionStorage.getItem("vv-demo-role")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(
      await screen.findByRole("heading", { name: "Welcome back." }),
    ).toBeInTheDocument();
    expect(access.client.auth.signOut).toHaveBeenCalledWith({
      scope: "global",
    });
    expect(screen.queryByText("Adult account owner")).not.toBeInTheDocument();
  });
  it("removes account content when an expired session is signed out", async () => {
    const f = setup();
    open(f.access, "/studio");
    await screen.findByRole("heading", {
      name: "Welcome, Adult account owner.",
    });
    f.emit("SIGNED_OUT", null);
    expect(
      await screen.findByRole("heading", { name: "Welcome back." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Your session ended");
  });
  it("fails closed when refreshed access is revoked instead of falling back to demo", async () => {
    const f = setup();
    sessionStorage.setItem(
      "vv-demo-role",
      JSON.stringify({ role: "admin", expires: Date.now() + 900000 }),
    );
    open(f.access, "/studio");
    await screen.findByRole("heading", {
      name: "Welcome, Adult account owner.",
    });
    f.disable();
    f.emit("TOKEN_REFRESHED");
    expect(await screen.findByRole("alert")).toHaveTextContent(/revoked/);
    expect(
      screen.queryByRole("navigation", { name: "Workspace navigation" }),
    ).not.toBeInTheDocument();
  });
  it("never imports fictional progress and uses the account learner repository", async () => {
    const { access } = setup("learner");
    localStorage.setItem(
      "village-vidya-fictional-demo-v1",
      JSON.stringify({
        grade: 8,
        language: "English",
        subject: "Mathematics",
        progress: { equations: 100 },
        saved: ["equations"],
        available: true,
        lowData: true,
        goal: false,
        approved: [],
      }),
    );
    open(access, "/learn/progress");
    expect(
      await screen.findByRole("heading", { name: "No recorded learning yet." }),
    ).toBeInTheDocument();
    expect(access.learner.progress).toHaveBeenCalled();
    expect(access.learner.setBookmark).not.toHaveBeenCalled();
    expect(
      JSON.parse(localStorage.getItem("village-vidya-fictional-demo-v1")!)
        .progress.equations,
    ).toBe(100);
  });
  it("requires a recovery event and handles password recovery through Supabase", async () => {
    const user = userEvent.setup();
    const f = setup("champion");
    open(f.access, "/account/recovery");
    expect(
      await screen.findByRole("heading", {
        name: "A valid recovery link is needed.",
      }),
    ).toBeInTheDocument();
    expect(f.access.client.auth.updateUser).not.toHaveBeenCalled();
    f.emit("PASSWORD_RECOVERY");
    await user.type(
      await screen.findByLabelText(/^New password/),
      "new-safe-password",
    );
    await user.click(
      screen.getByRole("button", { name: "Update password & sign out" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your password has been updated",
    );
    expect(f.access.client.auth.updateUser).toHaveBeenCalledWith({
      password: "new-safe-password",
    });
    expect(f.access.client.auth.signOut).toHaveBeenCalledWith({
      scope: "global",
    });
  });
  it("keeps sign-in errors understandable", async () => {
    const user = userEvent.setup();
    const f = setup("tutor", false);
    vi.mocked(f.access.client.auth.signInWithPassword).mockRejectedValueOnce(
      new Error("offline"),
    );
    open(f.access, "/account/sign-in");
    await user.type(
      await screen.findByLabelText("Email address"),
      "adult@example.invalid",
    );
    await user.type(screen.getByLabelText("Password"), "bad-password");
    await user.click(screen.getByRole("button", { name: "Sign in securely" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
