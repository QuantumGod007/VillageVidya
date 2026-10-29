import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { setupAccount, openAccount } from "./helpers/account-fixture";
import { discoveryResult } from "./helpers/discovery-fixture";
import { curriculum } from "../src/data/curriculum";
import { DiscoveryContent } from "../src/features/tutor-discovery";
import type { Tables } from "../src/lib/data-access/database.types";
import type { DiscoveryResult } from "../src/lib/data-access/discovery-repository";
const enrollment: Tables<"learner_academic_enrollments"> = {
  id: "saved-context",
  learner_id: "learner",
  subject_id: "cbse-8-mathematics",
  language: "English",
  is_active: true,
  created_at: "",
  updated_at: "",
};
function fixture() {
  const f = setupAccount("learner");
  vi.mocked(f.access.curriculum.load).mockResolvedValue(curriculum);
  vi.mocked(f.access.learner.enrollments).mockResolvedValue([enrollment]);
  vi.mocked(f.access.discovery.search).mockImplementation(async (filters) =>
    discoveryResult(filters),
  );
  return f;
}
async function ready() {
  await screen.findByRole("heading", { name: "Test tutor 91000000" });
}
describe("authenticated discovery UI (transport fixtures; real API tests validate matching)", () => {
  it("uses saved academic context, renders server rank and links to adult-test requests", async () => {
    const f = fixture();
    openAccount(f.access, "/tutors");
    await ready();
    expect(screen.getByText("ADULT TEST MATCHING PREVIEW")).toBeInTheDocument();
    expect(screen.getByLabelText("Learner grade")).toHaveValue("cbse-8");
    expect(f.access.discovery.search).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectId: "cbse-8-mathematics",
        language: "English",
        weekday: null,
      }),
    );
    expect(
      screen.getByText(/Test approval is not physical verification/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Weekly preference covers the checked IST time/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /book|request|message|meet/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Request adult-test session" }),
    ).toHaveAttribute("href", expect.stringContaining("/sessions?candidate="));
    const user = userEvent.setup();
    await user.click(screen.getByText("Why this candidate qualifies"));
    expect(
      screen.getByText(
        "Trusted qualification for this board, grade and subject",
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(/Aditi|Aarav|Back tomorrow/),
    ).not.toBeInTheDocument();
  });
  it("hides outdated results immediately when filters change and submits explicit filters", async () => {
    const f = fixture();
    const user = userEvent.setup();
    openAccount(f.access, "/tutors");
    await ready();
    await user.selectOptions(screen.getByLabelText("Language"), "हिन्दी");
    expect(
      screen.queryByRole("heading", { name: "Test tutor 91000000" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Filters changed");
    vi.mocked(f.access.discovery.search).mockImplementationOnce(
      async (filters) => ({ ...discoveryResult(filters), candidates: [] }),
    );
    await user.click(
      screen.getByRole("button", { name: "Search test tutors" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "No eligible test tutors match yet.",
      }),
    ).toBeInTheDocument();
    expect(f.access.discovery.search).toHaveBeenLastCalledWith(
      expect.objectContaining({ language: "हिन्दी" }),
    );
    expect(f.access.learner.enroll).not.toHaveBeenCalled();
  });
  it("supports board/grade coverage gaps and never fabricates subject choices", async () => {
    const f = fixture();
    const user = userEvent.setup();
    openAccount(f.access, "/tutors");
    await ready();
    await user.selectOptions(
      screen.getByLabelText("Academic board"),
      "maharashtra",
    );
    await user.selectOptions(
      screen.getByLabelText("Learner grade"),
      "maharashtra-8",
    );
    expect(screen.getByLabelText("Subject")).toBeDisabled();
    expect(
      screen.getByText(/There are no published subjects/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Search test tutors" }),
    ).toBeDisabled();
    expect(f.access.discovery.search).toHaveBeenCalledTimes(1);
  });
  it("compares weekly windows, validates bounds and applies preference-only and ID search", async () => {
    const f = fixture();
    const user = userEvent.setup();
    openAccount(f.access, "/tutors");
    await ready();
    await user.selectOptions(
      screen.getByLabelText("Preference comparison"),
      "weekly",
    );
    await user.selectOptions(screen.getByLabelText("Weekday"), "3");
    await user.clear(screen.getByLabelText("Until (IST)"));
    await user.type(screen.getByLabelText("Until (IST)"), "15:00");
    await user.click(
      screen.getByRole("button", { name: "Search test tutors" }),
    );
    expect(screen.getByRole("alert")).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "15 minutes to 4 hours",
    );
    await user.clear(screen.getByLabelText("Until (IST)"));
    await user.type(screen.getByLabelText("Until (IST)"), "17:00");
    await user.type(screen.getByLabelText("Search test tutor ID"), "91000000");
    await user.click(screen.getByLabelText("Only matching weekly preferences"));
    await user.click(
      screen.getByRole("button", { name: "Search test tutors" }),
    );
    await ready();
    expect(f.access.discovery.search).toHaveBeenLastCalledWith({
      subjectId: "cbse-8-mathematics",
      language: "English",
      query: "91000000",
      weekday: 3,
      startsAt: "16:00",
      endsAt: "17:00",
      preferenceOnly: true,
    });
    expect(screen.getByText(/covers your chosen window/)).toBeInTheDocument();
  });
  it("shows initial context loading, failure and retry without fictional fallbacks", async () => {
    const f = fixture();
    vi.mocked(f.access.curriculum.load).mockRejectedValueOnce(
      new Error("offline"),
    );
    const user = userEvent.setup();
    openAccount(f.access, "/tutors");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "academic context could not be loaded",
    );
    await user.click(
      screen.getByRole("button", { name: "Retry academic context" }),
    );
    await ready();
  });
  it("clears failed results and supports manual retry", async () => {
    const f = fixture();
    const user = userEvent.setup();
    openAccount(f.access, "/tutors");
    await ready();
    vi.mocked(f.access.discovery.search).mockRejectedValueOnce(
      new Error("Learner access revoked or connection lost."),
    );
    await user.click(screen.getByRole("button", { name: "Refresh matches" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveFocus();
    expect(
      screen.queryByRole("heading", { name: "Test tutor 91000000" }),
    ).not.toBeInTheDocument();
    await user.click(
      within(alert).getByRole("button", { name: "Retry discovery" }),
    );
    await ready();
  });
  it.each(["tutor", "guardian", "champion", "admin"] as const)(
    "keeps %s outside learner discovery",
    async (role) => {
      const f = setupAccount(role);
      openAccount(f.access, "/tutors");
      await screen.findByRole("heading", {
        name: "Adult learner preview only.",
      });
      expect(f.access.discovery.search).not.toHaveBeenCalled();
    },
  );
  it("requires context selection when none is saved", async () => {
    const f = fixture();
    vi.mocked(f.access.learner.enrollments).mockResolvedValue([]);
    const user = userEvent.setup();
    openAccount(f.access, "/tutors");
    await screen.findByRole("heading", {
      name: "Choose your academic context.",
    });
    expect(f.access.discovery.search).not.toHaveBeenCalled();
    await user.selectOptions(screen.getByLabelText("Learner grade"), "cbse-8");
    await user.selectOptions(
      screen.getByLabelText("Subject"),
      "cbse-8-mathematics",
    );
    await user.click(
      screen.getByRole("button", { name: "Search test tutors" }),
    );
    await ready();
  });
  it("does not restore pending results after sign-out or account switch", async () => {
    const f = fixture();
    let finish!: (data: DiscoveryResult) => void;
    vi.mocked(f.access.discovery.search).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    openAccount(f.access, "/tutors");
    await screen.findByText("Checking current eligibility and ranking…");
    await act(async () => {
      f.emit("SIGNED_OUT", null);
    });
    await screen.findByRole("heading", { name: "Welcome back." });
    await act(async () => {
      finish(discoveryResult());
    });
    expect(screen.queryByText("Test tutor 91000000")).not.toBeInTheDocument();
  });
  it("expires preview records and refreshes; offline events remove private results", async () => {
    vi.useFakeTimers();
    const f = fixture();
    await act(async () => {
      render(
        <MemoryRouter>
          <DiscoveryContent
            access={f.access}
            catalog={curriculum}
            enrollments={[enrollment]}
            language="English"
          />
        </MemoryRouter>,
      );
    });
    expect(
      screen.getByRole("heading", { name: "Test tutor 91000000" }),
    ).toBeInTheDocument();
    vi.mocked(f.access.discovery.search).mockImplementationOnce(
      async (filters) => ({ ...discoveryResult(filters), candidates: [] }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_001);
    });
    expect(f.access.discovery.search).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Test tutor 91000000")).not.toBeInTheDocument();
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    expect(
      screen.getByRole("heading", { name: "Test tutor 91000000" }),
    ).toBeInTheDocument();
    await act(async () => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.queryByText("Test tutor 91000000")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("offline");
  });
  it("keeps server order and reports bounded results", async () => {
    const f = fixture();
    const result = discoveryResult();
    result.more_available = true;
    result.candidates.push({
      ...result.candidates[0],
      preview_id: "92000000-0000-4000-8000-000000000002",
      label: "Test tutor 92000000",
      cms: 80,
      preference_matches: false,
      has_weekly_preference: false,
      factors: { subject: 1, language: 1, teaching: 0.75, availability: 0 },
    });
    vi.mocked(f.access.discovery.search).mockResolvedValue(result);
    openAccount(f.access, "/tutors");
    await ready();
    const cards = screen.getAllByRole("article");
    expect(cards[0]).toHaveTextContent("91000000");
    expect(cards[1]).toHaveTextContent("92000000");
    expect(screen.getByText(/Showing the first 24/)).toBeInTheDocument();
    expect(
      screen.getByText("No enabled weekly preference saved"),
    ).toBeInTheDocument();
  });
  it("persists tutor opt-in separately from verification", async () => {
    const f = setupAccount("tutor");
    const user = userEvent.setup();
    vi.mocked(f.access.tutor.setDiscoveryPreview).mockImplementation(
      async (enabled) => {
        const profile = f.data.tutor_profiles as Tables<"tutor_profiles">;
        profile.discovery_preview_enabled = enabled;
        profile.revision++;
      },
    );
    openAccount(f.access, "/settings");
    await user.type(
      await screen.findByLabelText("Teaching biography"),
      "An introduction I have not saved yet",
    );
    await user.click(
      await screen.findByRole("button", { name: "Join adult test preview" }),
    );
    await screen.findByText(
      "Adult test preview preference saved. Real tutoring remains closed.",
    );
    expect(f.access.tutor.setDiscoveryPreview).toHaveBeenCalledWith(true, 1);
    expect(screen.getByLabelText("Teaching biography")).toHaveValue(
      "An introduction I have not saved yet",
    );
    expect(f.access.tutor.saveBio).not.toHaveBeenCalled();
    expect(screen.getByText("Verification not started")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Leave adult test preview" }),
    );
    await screen.findByRole("button", { name: "Join adult test preview" });
    expect(screen.getByLabelText("Teaching biography")).toHaveValue(
      "An introduction I have not saved yet",
    );
  });
});
