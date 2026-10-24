import { describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { verifiedAccount } from "../src/lib/auth/account";
import {
  setupAccount as setup,
  openAccount as open,
} from "./helpers/account-fixture";
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
  it("does not resurrect a demo role after an invalid stored real session", async () => {
    const { access } = setup("tutor", false);
    sessionStorage.setItem("vv-workspace-mode", "account");
    sessionStorage.setItem(
      "vv-demo-role",
      JSON.stringify({ role: "admin", expires: Date.now() + 900000 }),
    );
    open(access, "/admin");
    expect(
      await screen.findByRole("heading", { name: "Welcome back." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Your session ended");
    expect(
      screen.queryByRole("navigation", { name: "Workspace navigation" }),
    ).not.toBeInTheDocument();
  });
  it("does not revalidate or unmount the demo on an idle account timer", async () => {
    const { access } = setup("tutor", false);
    sessionStorage.setItem(
      "vv-demo-role",
      JSON.stringify({ role: "learner", expires: Date.now() + 900000 }),
    );
    open(access, "/learn");
    await screen.findByRole("heading", { name: /Good to see you, Aarav/ });
    const calls = vi.mocked(access.client.auth.getSession).mock.calls.length;
    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(access.client.auth.getSession).toHaveBeenCalledTimes(calls);
    expect(
      screen.getByRole("heading", { name: /Good to see you, Aarav/ }),
    ).toBeInTheDocument();
  });
});
