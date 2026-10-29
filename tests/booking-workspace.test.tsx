import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { openAccount } from "./helpers/account-fixture";
import { bookingFixture, bookingIds } from "./helpers/booking-fixture";
async function ready() {
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Refresh requests and sessions" }),
    ).toBeEnabled(),
  );
}
describe("authenticated booking interfaces (transport fixtures; real API/browser tests enforce security)", () => {
  it("discards a previous account's late mutation result without starting another read", async () => {
    const f = bookingFixture("tutor"),
      user = userEvent.setup();
    let finish!: (value: string) => void;
    vi.mocked(f.repository.respond).mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done;
        }),
    );
    openAccount(f.access, "/sessions");
    await ready();
    await user.click(
      screen.getByRole("button", { name: "Accept test request" }),
    );
    const reads = vi.mocked(f.repository.load).mock.calls.length;
    await act(async () => f.emit("SIGNED_OUT", null));
    await act(async () => finish(bookingIds.session));
    expect(f.repository.load).toHaveBeenCalledTimes(reads);
    expect(
      screen.queryByText("Synthetic fractions practice"),
    ).not.toBeInTheDocument();
  });
  it("stops polling while its document is hidden", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const f = bookingFixture();
    openAccount(f.access, "/sessions");
    await ready();
    const reads = vi.mocked(f.repository.load).mock.calls.length;
    const visibility = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("hidden");
    await act(async () => vi.advanceTimersByTimeAsync(15_000));
    expect(f.repository.load).toHaveBeenCalledTimes(reads);
    visibility.mockReturnValue("visible");
    await act(async () =>
      document.dispatchEvent(new Event("visibilitychange")),
    );
    expect(f.repository.load).toHaveBeenCalledTimes(reads + 1);
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(f.repository.load).toHaveBeenCalledTimes(reads + 2);
    visibility.mockRestore();
  });
  it("shows genuine server requests and participant actions without fictional appointments", async () => {
    const f = bookingFixture();
    openAccount(f.access, "/sessions");
    await screen.findByText("Synthetic fractions practice");
    await ready();
    expect(
      screen.getByText(/Response window: about 45 seconds/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Accept test request" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel test request" }),
    ).toBeEnabled();
    expect(
      screen.queryByText(/Aditi|Aarav|AI reply|demo-session/),
    ).not.toBeInTheDocument();
  });
  it("locks duplicate acceptance and reloads the server-owned shared session", async () => {
    const f = bookingFixture("tutor"),
      user = userEvent.setup();
    let complete!: () => void;
    vi.mocked(f.repository.respond).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = () => {
            f.request.status = "accepted";
            f.request.revision = 2;
            f.request.session_id = bookingIds.session;
            f.records.sessions = [f.session];
            resolve(bookingIds.session);
          };
        }),
    );
    openAccount(f.access, "/sessions");
    await ready();
    const accept = screen.getByRole("button", { name: "Accept test request" });
    await user.click(accept);
    await user.click(accept);
    expect(accept).toBeDisabled();
    expect(f.repository.respond).toHaveBeenCalledTimes(1);
    expect(f.repository.respond).toHaveBeenCalledWith({
      requestId: bookingIds.request,
      revision: 1,
      action: "accept",
      intentId: expect.any(String),
    });
    await act(async () => complete());
    await screen.findByText("Scheduled");
    expect(
      screen.getByRole("link", { name: "View confirmed session" }),
    ).toHaveAttribute("href", `/room/${bookingIds.session}`);
  });
  it("navigates a manual fallback to the server-created next invitation", async () => {
    const f = bookingFixture(),
      user = userEvent.setup();
    f.request.status = "declined";
    f.request.can_fallback = true;
    vi.mocked(f.repository.request).mockImplementationOnce(async () => {
      f.records.requests = [
        {
          ...f.request,
          id: bookingIds.next,
          status: "pending",
          can_fallback: false,
        },
      ];
      return bookingIds.next;
    });
    openAccount(f.access, "/sessions");
    await ready();
    await user.click(
      screen.getByRole("button", { name: "Try next eligible tutor" }),
    );
    await screen.findByRole("article", { name: `Request ${bookingIds.next}` });
    expect(f.repository.request).toHaveBeenCalledWith({
      previousRequestId: bookingIds.request,
      intentId: expect.any(String),
    });
    await waitFor(() =>
      expect(f.repository.load).toHaveBeenLastCalledWith(bookingIds.next),
    );
  });
  it("clears stale/private records after an action error and requires refresh", async () => {
    const f = bookingFixture("tutor"),
      user = userEvent.setup();
    vi.mocked(f.repository.respond).mockRejectedValueOnce(
      new Error("The record changed."),
    );
    openAccount(f.access, "/sessions");
    await ready();
    await user.click(
      screen.getByRole("button", { name: "Accept test request" }),
    );
    const error = await screen.findByRole("alert");
    await waitFor(() => expect(error).toHaveFocus());
    expect(error).toHaveTextContent("Refresh to check server state");
    expect(
      screen.queryByText("Synthetic fractions practice"),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Refresh requests and sessions" }),
    );
    await screen.findByText("Synthetic fractions practice");
  });
  it("does not restore a previous account's late booking response after sign-out", async () => {
    const f = bookingFixture();
    let resolve!: (value: typeof f.records) => void;
    vi.mocked(f.repository.load).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    openAccount(f.access, "/sessions");
    await screen.findByText("Checking current requests and sessions…");
    await act(async () => f.emit("SIGNED_OUT", null));
    await act(async () => resolve(f.records));
    expect(
      screen.queryByText("Synthetic fractions practice"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Test tutor a1000000")).not.toBeInTheDocument();
  });
  it("loads only the requested session and preserves the session state machine UI", async () => {
    const f = bookingFixture(),
      user = userEvent.setup();
    f.records.sessions = [
      {
        ...f.session,
        status: "active",
        started_at: f.records.as_of,
        revision: 2,
      },
    ];
    vi.mocked(f.repository.transition).mockImplementationOnce(async () => {
      f.records.sessions[0].status = "completed";
      f.records.sessions[0].revision = 3;
      return bookingIds.session;
    });
    openAccount(f.access, `/room/${bookingIds.session}`);
    await ready();
    expect(f.repository.load).toHaveBeenCalledWith(bookingIds.session);
    const card = screen.getByRole("article", {
      name: `Session ${bookingIds.session}`,
    });
    await user.type(
      within(card).getByLabelText("Text session summary (optional)"),
      "Synthetic learning exercise complete.",
    );
    await user.click(
      within(card).getByRole("button", { name: "Complete session record" }),
    );
    await screen.findByText("Completed");
    expect(f.repository.transition).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: bookingIds.session,
        revision: 2,
        action: "complete",
        note: "Synthetic learning exercise complete.",
      }),
    );
  });
  it("submits an explicit IST schedule using the opaque discovery ID, never an owner ID", async () => {
    const f = bookingFixture(),
      user = userEvent.setup();
    f.records.requests = [];
    vi.mocked(f.repository.request).mockResolvedValue(bookingIds.request);
    openAccount(
      f.access,
      `/sessions?candidate=${bookingIds.preview}&subject=cbse-8-mathematics&language=English`,
    );
    await ready();
    await user.type(screen.getByLabelText("Session date (IST)"), "2026-10-27");
    await user.type(screen.getByLabelText("Session start time (IST)"), "16:00");
    await user.type(
      screen.getByLabelText("Learning topic (optional)"),
      "Synthetic fractions practice",
    );
    await user.click(screen.getByRole("button", { name: "Send test request" }));
    expect(f.repository.request).toHaveBeenCalledWith({
      previewId: bookingIds.preview,
      subjectId: "cbse-8-mathematics",
      language: "English",
      startsAt: "2026-10-27T10:30:00.000Z",
      durationMinutes: 15,
      topic: "Synthetic fractions practice",
      intentId: expect.any(String),
    });
  });
});
