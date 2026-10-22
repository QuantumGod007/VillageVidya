import { Suspense } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../src/app-routes";
import { StoreProvider } from "../src/lib/store";
import { workspaceNavigation } from "../src/components/workspace-navigation";
import type { Role } from "../src/domain/types";
function open(role: Role | null, route: string) {
  if (role)
    sessionStorage.setItem(
      "vv-demo-role",
      JSON.stringify({ role, expires: Date.now() + 900000 }),
    );
  return render(
    <MemoryRouter initialEntries={[route]}>
      <StoreProvider>
        <Suspense fallback={<p>Loading</p>}>
          <AppRoutes />
        </Suspense>
      </StoreProvider>
    </MemoryRouter>,
  );
}
describe("workspace routes and navigation", () => {
  it("focuses a direct section link after its lazy page is ready", async () => {
    open("tutor", "/studio#schedule");
    await waitFor(() =>
      expect(document.getElementById("schedule")).toHaveFocus(),
    );
    expect(document.title).toBe("Schedule · Village Vidya");
  });

  it("keeps discovery, lessons, progress and community inside the learner workspace", async () => {
    const user = userEvent.setup();
    open("learner", "/learn");
    const nav = await screen.findByRole("navigation", {
      name: "Workspace navigation",
    });
    expect(within(nav).getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    for (const label of [
      "My Learning",
      "Find Tutors",
      "Sessions",
      "Ask AI",
      "Progress",
      "Community",
      "Settings",
    ]) {
      await user.click(
        within(
          await screen.findByRole("navigation", {
            name: "Workspace navigation",
          }),
        ).getByRole("link", { name: label }),
      );
      await waitFor(() =>
        expect(
          within(
            screen.getByRole("navigation", { name: "Workspace navigation" }),
          ).getByRole("link", { name: label }),
        ).toHaveAttribute("aria-current", "page"),
      );
      expect(
        screen.queryByRole("navigation", { name: "Main navigation" }),
      ).not.toBeInTheDocument();
    }
  });
  it("retains the learning parent and breadcrumb on lesson deep links", async () => {
    open("learner", "/lesson/fractions");
    const nav = await screen.findByRole("navigation", {
      name: "Workspace navigation",
    });
    expect(
      within(nav).getByRole("link", { name: "My Learning" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      await screen.findByRole("heading", { name: /Fractions, made familiar/ }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByRole(
        "link",
        { name: "My Learning" },
      ),
    ).toHaveAttribute("href", "/explore");
  });
  it.each(["tutor", "guardian", "champion", "admin"] as const)(
    "exposes the complete %s navigation and opens each existing destination",
    async (role) => {
      const user = userEvent.setup();
      open(role, workspaceNavigation[role][0].to);
      for (const item of workspaceNavigation[role]) {
        const nav = await screen.findByRole("navigation", {
          name: "Workspace navigation",
        });
        await user.click(within(nav).getByRole("link", { name: item.label }));
        await waitFor(() =>
          expect(
            within(
              screen.getByRole("navigation", { name: "Workspace navigation" }),
            ).getByRole("link", { name: item.label }),
          ).toHaveAttribute("aria-current", "page"),
        );
        if (item.to.includes("#"))
          expect(document.getElementById(item.to.split("#")[1])).toHaveFocus();
      }
    },
  );
  it("offers the same destinations in the keyboard-operated mobile dialog and closes after selection", async () => {
    const user = userEvent.setup();
    open("learner", "/learn");
    const trigger = await screen.findByRole("button", {
      name: "Open workspace navigation",
    });
    trigger.focus();
    await user.keyboard("{Enter}");
    const dialog = screen.getByRole("dialog", { name: "Learner workspace" });
    expect(
      within(dialog)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      ...workspaceNavigation.learner.map((item) => item.label),
      "Public website ",
    ]);
    await user.click(within(dialog).getByRole("link", { name: "Progress" }));
    expect(
      await screen.findByRole("heading", { name: "Your learning, in view." }),
    ).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Close dialog",
      }),
    );
    expect(trigger).toHaveFocus();
  });
  it.each(["/studio", "/guardian", "/champion", "/admin/users"])(
    "blocks learner access to %s",
    async (route) => {
      open("learner", route);
      expect(
        await screen.findByRole("button", { name: "Explore as Aarav" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("navigation", { name: "Workspace navigation" }),
      ).not.toBeInTheDocument();
    },
  );
  it.each([
    "/learn",
    "/learn/progress",
    "/sessions",
    "/assistant",
    "/settings",
    "/room/sample",
  ])("requires a demo profile for %s", async (route) => {
    open(null, route);
    expect(
      await screen.findByRole("button", { name: "Explore as Aarav" }),
    ).toBeInTheDocument();
  });

  it.each(["tutor", "guardian", "champion", "admin"] as const)(
    "keeps mobile %s destinations in parity with the desktop",
    async (role) => {
      const user = userEvent.setup();
      open(role, workspaceNavigation[role][0].to);
      await user.click(
        await screen.findByRole("button", {
          name: "Open workspace navigation",
        }),
      );
      const nav = screen.getByRole("navigation", {
        name: "Mobile workspace navigation",
      });
      expect(
        within(nav)
          .getAllByRole("link")
          .map((link) => link.getAttribute("href")),
      ).toEqual(workspaceNavigation[role].map((item) => item.to));
    },
  );
  it("preserves a completed checkpoint across the lesson-to-progress journey", async () => {
    const user = userEvent.setup();
    open("learner", "/learn");
    await user.click(
      await screen.findByRole("link", { name: "Continue learning" }),
    );
    await user.click(
      await screen.findByRole("radio", { name: /3\/4 of a roti/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Check my understanding" }),
    );
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Workspace navigation" }),
      ).getByRole("link", { name: "Progress" }),
    );
    expect(
      await screen.findByRole("progressbar", {
        name: "Fractions, made familiar mastery",
      }),
    ).toHaveAttribute("aria-valuenow", "100");
  });
  it("keeps public discovery usable without a profile", async () => {
    open(null, "/explore");
    expect(
      await screen.findByRole("heading", {
        name: "Small lessons. Lasting understanding.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Workspace navigation" }),
    ).not.toBeInTheDocument();
  });
  it("returns to profile selection when leaving the demo", async () => {
    const user = userEvent.setup();
    open("learner", "/learn");
    await user.click(await screen.findByRole("button", { name: "Leave demo" }));
    expect(
      await screen.findByRole("button", { name: "Explore as Aarav" }),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem("vv-demo-role")).toBeNull();
  });
  it("keeps an unknown internal URL in the shell with a useful return path", async () => {
    open("learner", "/unknown");
    expect(
      await screen.findByRole("link", { name: "Back to overview" }),
    ).toHaveAttribute("href", "/learn");
    expect(
      screen.getByRole("navigation", { name: "Workspace navigation" }),
    ).toBeInTheDocument();
  });
});
