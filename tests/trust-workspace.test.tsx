import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { openAccount } from "./helpers/account-fixture";
import { trustFixture, trustIds } from "./helpers/trust-fixture";
async function ready() {
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Refresh trust records" }),
    ).toBeEnabled(),
  );
}
describe("authenticated trust interfaces (transport fixtures; SQL/Auth tests enforce security)", () => {
  it.each(["verification", "reports", "history", "moderation"])(
    "focuses Champion #%s after records load",
    async (hash) => {
      const f = trustFixture();
      let resolve!: (v: typeof f.records) => void;
      vi.mocked(f.access.trust.load).mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      );
      openAccount(f.access, `/champion#${hash}`);
      await screen.findByText("Loading current trust records…");
      expect(document.getElementById(hash)).toBeNull();
      await act(async () => resolve(structuredClone(f.records)));
      await ready();
      // Button state is committed before passive focus effects necessarily run.
      // Observe focus itself rather than assuming the enabled button signals it.
      await waitFor(() => expect(document.getElementById(hash)).toHaveFocus());
    },
  );
  it("honours the latest hash during a pending load and does not steal focus on refresh", async () => {
    const f = trustFixture();
    const user = userEvent.setup();
    let resolve!: (v: typeof f.records) => void;
    vi.mocked(f.access.trust.load).mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    openAccount(f.access, "/champion#verification");
    await screen.findByText("Loading current trust records…");
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Workspace navigation" }),
      ).getByRole("link", { name: "Safety Reports" }),
    );
    await act(async () => resolve(structuredClone(f.records)));
    await waitFor(() =>
      expect(document.getElementById("reports")).toHaveFocus(),
    );
    const input = screen.getByLabelText(
      "Narrow review lists by account or record ID",
    );
    await user.click(input);
    await act(async () => window.dispatchEvent(new Event("focus")));
    await ready();
    expect(input).toHaveFocus();
  });
  it.each(["progress", "consent", "updates"])(
    "focuses guardian #%s after records load",
    async (hash) => {
      const f = trustFixture("guardian");
      openAccount(f.access, `/guardian#${hash}`);
      await ready();
      await waitFor(() => expect(document.getElementById(hash)).toHaveFocus());
    },
  );
  it("loads newly administered relationships when navigating within the guardian workspace", async () => {
    const f = trustFixture("guardian");
    const links = f.records.relationships;
    f.records.relationships = [];
    const user = userEvent.setup();
    openAccount(f.access, "/guardian");
    await screen.findByText("No linked adult tester.");
    f.records.relationships = links;
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Workspace navigation" }),
      ).getByRole("link", { name: "Consent" }),
    );
    await screen.findByText("Consent: Approved test record");
    expect(f.access.trust.load).toHaveBeenCalledTimes(2);
  });
  it("hides linked private data while navigation rechecks a consent withdrawal", async () => {
    const f = trustFixture("guardian");
    const user = userEvent.setup();
    openAccount(f.access, "/guardian");
    await screen.findByText("Linked adult learner");
    f.records.relationships[0].can_share = false;
    f.records.relationships[0].consent_status = "revoked";
    let resolve!: (v: typeof f.records) => void;
    vi.mocked(f.access.trust.load).mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Workspace navigation" }),
      ).getByRole("link", { name: "Consent" }),
    );
    await screen.findByText("Loading current trust records…");
    expect(screen.queryByText("Linked adult learner")).not.toBeInTheDocument();
    await act(async () => resolve(structuredClone(f.records)));
    await screen.findByText("Consent: Revoked");
    expect(screen.queryByText("Linked adult learner")).not.toBeInTheDocument();
  });
  it("requires a reason and explicit confirmation, locks duplicate clicks, then reloads authoritative status", async () => {
    const f = trustFixture();
    const user = userEvent.setup();
    let complete!: () => void;
    vi.mocked(f.access.trust.reviewTutor).mockImplementation(
      () =>
        new Promise<void>((r) => {
          complete = () => {
            f.records.tutor_reviews[0].status = "approved";
            f.records.tutor_reviews[0].token = "next";
            r();
          };
        }),
    );
    openAccount(f.access, "/champion");
    await ready();
    const review = screen.getByRole("button", { name: "Review test decision" });
    expect(review).toBeDisabled();
    await user.type(
      screen.getByLabelText("Decision reason"),
      "Synthetic independent classroom decision.",
    );
    await user.click(review);
    expect(f.access.trust.reviewTutor).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("does not verify a real identity");
    await user.click(
      within(dialog).getByRole("button", { name: "Confirm test action" }),
    );
    expect(
      within(dialog).getByRole("button", { name: "Recording test action…" }),
    ).toBeDisabled();
    expect(f.access.trust.reviewTutor).toHaveBeenCalledTimes(1);
    expect(f.access.trust.reviewTutor).toHaveBeenCalledWith(
      expect.objectContaining({
        tutorId: trustIds.tutor,
        token: "current-token",
        status: "approved",
        requestId: expect.any(String),
      }),
    );
    await act(async () => complete());
    await screen.findByText(/Adult-test decision recorded/);
    expect(
      screen.getByRole("option", { name: "Revoke test approval" }),
    ).toBeInTheDocument();
  });
  it("clears a failed/stale review, focuses the error and requires a fresh load", async () => {
    const f = trustFixture();
    const user = userEvent.setup();
    vi.mocked(f.access.trust.reviewTutor).mockRejectedValue(
      new Error("Authoritative record changed."),
    );
    openAccount(f.access, "/champion");
    await ready();
    await user.type(
      screen.getByLabelText("Decision reason"),
      "This synthetic reason is long enough.",
    );
    await user.click(
      screen.getByRole("button", { name: "Review test decision" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm test action" }),
    );
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Refresh to check");
    expect(alert).toHaveFocus();
    expect(screen.queryByText("Test tutor 80000000")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Refresh trust records" }),
    );
    await screen.findByText("Test tutor 80000000");
  });
  it("hides private linked data while withdrawal is pending and after confirmation", async () => {
    const f = trustFixture("guardian");
    const user = userEvent.setup();
    let complete!: () => void;
    vi.mocked(f.access.trust.consent).mockImplementation(
      () =>
        new Promise<void>((r) => {
          complete = () => {
            f.records.relationships[0].can_share = false;
            f.records.relationships[0].consent_status = "revoked";
            f.records.relationships[0].consent_event = 3;
            r();
          };
        }),
    );
    openAccount(f.access, "/guardian");
    await screen.findByText("Linked adult learner");
    await user.type(
      screen.getByLabelText("Test consent reason"),
      "Withdraw this synthetic adult consent.",
    );
    await user.click(
      screen.getByRole("button", { name: "Withdraw test consent" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm test action" }),
    );
    expect(screen.queryByText("Linked adult learner")).not.toBeInTheDocument();
    await act(async () => complete());
    await screen.findByText("Consent: Revoked");
    expect(screen.queryByText("Linked adult learner")).not.toBeInTheDocument();
    expect(f.access.trust.consent).toHaveBeenCalledWith(
      expect.objectContaining({
        relationshipId: trustIds.link,
        expectedEvent: 2,
        grant: false,
      }),
    );
  });
  it("never loads linked private data without current consent and clears it offline", async () => {
    const f = trustFixture("guardian");
    f.records.relationships[0].can_share = false;
    f.records.relationships[0].consent_status = "pending";
    openAccount(f.access, "/guardian");
    await ready();
    expect(f.access.trust.learner).not.toHaveBeenCalled();
    await act(async () => window.dispatchEvent(new Event("offline")));
    expect(screen.getByRole("alert")).toHaveTextContent("offline");
    expect(
      screen.queryByText("Adult-test relationship"),
    ).not.toBeInTheDocument();
  });
  it("shows real empty and forbidden states without fictional activity", async () => {
    const f = trustFixture();
    f.records.tutor_reviews = [];
    vi.mocked(f.access.trust.load).mockRejectedValueOnce(
      new Error("Role/session denied."),
    );
    const user = userEvent.setup();
    openAccount(f.access, "/champion");
    expect(await screen.findByRole("alert")).toHaveTextContent("denied");
    await user.click(
      screen.getByRole("button", { name: "Refresh trust records" }),
    );
    await screen.findByText("No permitted tutor reviews.");
    expect(screen.queryByText(/Aditi|Aarav|85%/)).not.toBeInTheDocument();
  });
  it("submits a labelled synthetic report once and displays the server ID without private history", async () => {
    const f = trustFixture("learner");
    const user = userEvent.setup();
    let complete!: () => void;
    vi.mocked(f.access.trust.submitReport).mockImplementation(
      (i) =>
        new Promise<string>((r) => {
          complete = () => {
            f.records.reports = [
              {
                id: trustIds.report,
                category: i.category,
                summary: i.summary,
                status: "submitted",
                revision: 1,
                created_at: f.records.as_of,
                updated_at: f.records.as_of,
              },
            ];
            r(trustIds.report);
          };
        }),
    );
    openAccount(f.access, "/safety");
    await ready();
    await user.type(
      screen.getByLabelText("Synthetic report summary"),
      "Synthetic content concern for adult classroom.",
    );
    expect(
      screen.getByRole("button", { name: "Submit test report" }),
    ).toBeDisabled();
    await user.click(
      screen.getByLabelText("This describes a synthetic adult-test scenario."),
    );
    await user.click(
      screen.getByRole("button", { name: "Submit test report" }),
    );
    expect(
      screen.getByRole("button", { name: "Submit test report" }),
    ).toBeDisabled();
    await act(async () => complete());
    await screen.findByText(/Server ID 80000000/);
    expect(f.access.trust.submitReport).toHaveBeenCalledTimes(1);
    expect(f.access.trust.history).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "View decision history" }),
    ).not.toBeInTheDocument();
  });
  it("discards late data on account sign-out", async () => {
    const f = trustFixture("guardian");
    let resolve!: (v: typeof f.records) => void;
    vi.mocked(f.access.trust.load).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    openAccount(f.access, "/guardian");
    await screen.findByText("Loading current trust records…");
    await act(async () => f.emit("SIGNED_OUT", null));
    await act(async () => resolve(f.records));
    expect(screen.queryByText("Linked adult learner")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Adult-test relationship"),
    ).not.toBeInTheDocument();
  });
});
