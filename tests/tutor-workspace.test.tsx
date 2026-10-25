import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { setupAccount, openAccount } from "./helpers/account-fixture";
import { curriculum } from "../src/data/curriculum";
import {
  validateInterval,
  verificationLabel,
} from "../src/features/tutor-workspace";
import type { TutorSnapshot } from "../src/lib/data-access/tutor-repository";
function fixture() {
  const f = setupAccount("tutor");
  const records: TutorSnapshot = {
    profile: f.data.tutor_profiles as TutorSnapshot["profile"],
    availability: [],
    subjects: [],
    languages: [],
    verification: [],
  };
  vi.mocked(f.access.curriculum.load).mockResolvedValue(curriculum);
  vi.mocked(f.access.tutor.load).mockImplementation(async () =>
    structuredClone(records),
  );
  vi.mocked(f.access.tutor.saveBio).mockImplementation(
    async (bio, revision) => {
      if (revision !== records.profile.revision)
        throw new Error("Concurrent edit. Refresh records.");
      records.profile.bio = bio.trim();
      records.profile.revision++;
    },
  );
  vi.mocked(f.access.tutor.saveAvailability).mockImplementation(
    async (input) => {
      const row = {
        ...input,
        revision: (input.revision ?? 0) + 1,
        tutor_id: records.profile.user_id,
        timezone: "Asia/Kolkata",
        created_at: "",
        updated_at: "",
      };
      records.availability = [
        ...records.availability.filter((r) => r.id !== input.id),
        row,
      ];
    },
  );
  vi.mocked(f.access.tutor.deleteAvailability).mockImplementation(
    async (id) => {
      records.availability = records.availability.filter((r) => r.id !== id);
    },
  );
  return { ...f, records };
}
async function ready() {
  await screen.findByRole("heading", { name: "Weekly availability" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Add interval" })).toBeEnabled(),
  );
}
describe("authenticated tutor workspace (transport fixtures; PostgreSQL and Auth suites prove authorization)", () => {
  it.each(["requests", "schedule", "growth"])(
    "focuses #%s after asynchronous records load",
    async (hash) => {
      const f = fixture();
      openAccount(f.access, `/studio#${hash}`);
      await ready();
      expect(document.getElementById(hash)).toHaveFocus();
    },
  );
  it("shows stored identity and honest empty states without demo history", async () => {
    const f = fixture();
    openAccount(f.access, "/studio");
    await ready();
    expect(screen.getByText("Verification not started")).toBeInTheDocument();
    expect(
      screen.getByText("No trusted subject qualification recorded"),
    ).toBeInTheDocument();
    expect(screen.getByText("No evaluated score recorded")).toBeInTheDocument();
    expect(
      screen.getByText("0 of 2 personal preparation steps saved"),
    ).toBeInTheDocument();
    expect(screen.getByText(/cannot receive bookings/)).toBeInTheDocument();
    expect(
      screen.queryByText(/Aditi|Aarav|Mentor badge/),
    ).not.toBeInTheDocument();
    expect(f.access.learner.progress).not.toHaveBeenCalled();
    expect(document.getElementById("requests")).toBeInTheDocument();
    expect(document.getElementById("schedule")).toBeInTheDocument();
    expect(document.getElementById("growth")).toBeInTheDocument();
  });
  it("saves biography, confirms pending and success, and restores after remount", async () => {
    const f = fixture();
    const user = userEvent.setup();
    const view = openAccount(f.access, "/settings");
    await user.type(
      await screen.findByLabelText("Teaching biography"),
      "I enjoy explaining mathematics.",
    );
    expect(screen.getByText(f.records.profile.user_id)).toBeInTheDocument();
    expect(screen.getByText("Grade 12")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save biography" }));
    await screen.findByText("Biography saved to your account.");
    expect(f.access.tutor.saveBio).toHaveBeenCalledWith(
      "I enjoy explaining mathematics.",
      1,
    );
    view.unmount();
    openAccount(f.access, "/settings");
    expect(await screen.findByLabelText("Teaching biography")).toHaveValue(
      "I enjoy explaining mathematics.",
    );
    expect(
      screen.queryByRole("button", { name: /approve|verify/i }),
    ).not.toBeInTheDocument();
  });
  it("adds, edits, disables, enables and removes a weekly interval", async () => {
    const f = fixture();
    const user = userEvent.setup();
    openAccount(f.access, "/studio#schedule");
    await ready();
    await user.click(screen.getByRole("button", { name: "Add interval" }));
    await screen.findByText(
      "Weekly availability saved. Real bookings remain closed.",
    );
    await user.click(screen.getByRole("button", { name: "Edit Monday 16:00" }));
    expect(
      screen.getByRole("form", { name: "Weekly interval editor" }),
    ).toHaveFocus();
    await user.clear(screen.getByLabelText("Start time"));
    await user.type(screen.getByLabelText("Start time"), "15:30");
    await user.selectOptions(screen.getByLabelText("Day"), "0");
    await user.click(screen.getByRole("button", { name: "Save interval" }));
    await screen.findByRole("button", { name: "Disable Sunday 15:30" });
    await user.click(
      screen.getByRole("button", { name: "Disable Sunday 15:30" }),
    );
    await screen.findByRole("button", { name: "Enable Sunday 15:30" });
    await user.click(
      screen.getByRole("button", { name: "Enable Sunday 15:30" }),
    );
    await screen.findByRole("button", { name: "Disable Sunday 15:30" });
    await user.click(
      screen.getByRole("button", { name: "Remove Sunday 15:30" }),
    );
    await user.click(screen.getByRole("button", { name: "Confirm removal" }));
    await screen.findByText("Weekly interval removed.");
    expect(f.records.availability).toHaveLength(0);
  });
  it("rejects invalid and overlapping intervals while permitting adjacency", async () => {
    const f = fixture();
    const user = userEvent.setup();
    openAccount(f.access, "/studio");
    await ready();
    await user.click(screen.getByRole("button", { name: "Add interval" }));
    await screen.findByText(/Weekly availability saved/);
    await user.click(screen.getByRole("button", { name: "Add interval" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("overlaps");
    expect(f.access.tutor.saveAvailability).toHaveBeenCalledTimes(1);
    await user.clear(screen.getByLabelText("End time"));
    await user.type(screen.getByLabelText("End time"), "15:00");
    await user.click(screen.getByRole("button", { name: "Add interval" }));
    expect(screen.getByRole("alert")).toHaveTextContent("start before end");
    await user.clear(screen.getByLabelText("Start time"));
    await user.type(screen.getByLabelText("Start time"), "17:00");
    await user.clear(screen.getByLabelText("End time"));
    await user.type(screen.getByLabelText("End time"), "18:00");
    await user.click(screen.getByRole("button", { name: "Add interval" }));
    await waitFor(() => expect(f.records.availability).toHaveLength(2));
  });
  it("shows connection errors, preserves failed drafts and supports manual retry", async () => {
    const f = fixture();
    vi.mocked(f.access.tutor.load).mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    openAccount(f.access, "/settings");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "couldn’t refresh",
    );
    await user.click(screen.getByRole("button", { name: "Refresh records" }));
    await user.type(
      await screen.findByLabelText("Teaching biography"),
      "My unsaved introduction",
    );
    vi.mocked(f.access.tutor.saveBio).mockRejectedValueOnce(
      new Error("This record changed on another device."),
    );
    await user.click(screen.getByRole("button", { name: "Save biography" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "another device",
    );
    expect(screen.getByLabelText("Teaching biography")).toHaveValue(
      "My unsaved introduction",
    );
    expect(
      screen.getByRole("button", { name: "Save biography" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Refresh records" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save biography" }),
      ).toBeEnabled(),
    );
  });
  it("blocks duplicate submissions while saving", async () => {
    const f = fixture();
    const user = userEvent.setup();
    let finish!: () => void;
    vi.mocked(f.access.tutor.saveBio).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    openAccount(f.access, "/settings");
    await user.type(
      await screen.findByLabelText("Teaching biography"),
      "Pending introduction",
    );
    await user.click(screen.getByRole("button", { name: "Save biography" }));
    expect(
      screen.getByRole("button", { name: "Saving biography…" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Refresh records" }),
    ).toBeDisabled();
    await act(async () => finish());
    await screen.findByText("Biography saved to your account.");
    expect(f.access.tutor.saveBio).toHaveBeenCalledTimes(1);
  });
  it("displays authoritative verification order and actual aggregate values", async () => {
    const f = fixture();
    f.records.profile.teaching_skill_score = 72.5;
    f.records.profile.completed_sessions = 3;
    f.records.verification = [
      {
        id: "revoked",
        event_number: 2,
        tutor_id: f.records.profile.user_id,
        status: "revoked",
        decision_note: "Test-only revocation",
        verified_grade: null,
        reviewed_by: "reviewer",
        created_at: "2026-10-25T00:00:00Z",
      },
      {
        id: "approved",
        event_number: 1,
        tutor_id: f.records.profile.user_id,
        status: "approved",
        decision_note: "Test-only approval",
        verified_grade: 12,
        reviewed_by: "reviewer",
        created_at: "2026-10-24T00:00:00Z",
      },
    ];
    f.records.subjects = [
      {
        tutor_id: f.records.profile.user_id,
        subject_id: "cbse-8-mathematics",
        created_at: "",
        updated_at: "",
      },
    ];
    f.records.languages = [
      {
        tutor_id: f.records.profile.user_id,
        language: "English",
        created_at: "",
        updated_at: "",
      },
    ];
    openAccount(f.access, "/studio");
    await ready();
    expect(
      screen.getAllByText("Revoked in test records")[0],
    ).toBeInTheDocument();
    expect(
      screen.getByText("Mathematics · Grade 8 · CBSE"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("72.5 / 100 · trusted test record"),
    ).toBeInTheDocument();
    const history = screen
      .getByText(/Verification history/)
      .closest("details")!;
    expect(within(history).getAllByRole("listitem")[0]).toHaveTextContent(
      "Event 2",
    );
  });
  it("shows honest feedback and restores a saved schedule on a new mount", async () => {
    const f = fixture();
    const user = userEvent.setup();
    const view = openAccount(f.access, "/studio");
    await ready();
    await user.click(screen.getByRole("button", { name: "Add interval" }));
    await screen.findByText(/Weekly availability saved/);
    view.unmount();
    const restored = openAccount(f.access, "/studio");
    await ready();
    expect(
      screen.getByRole("button", { name: "Edit Monday 16:00" }),
    ).toBeInTheDocument();
    restored.unmount();
    openAccount(f.access, "/studio/feedback");
    expect(
      await screen.findByText("No detailed Co-Teacher evaluations recorded."),
    ).toBeInTheDocument();
    expect(screen.queryByText("72.5")).not.toBeInTheDocument();
  });
  it("keeps a dirty biography through background checks and removes revoked access", async () => {
    const f = fixture();
    const user = userEvent.setup();
    openAccount(f.access, "/settings");
    const input = await screen.findByLabelText("Teaching biography");
    await user.type(input, "A draft I am still writing");
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("A draft I am still writing");
    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("A draft I am still writing");
    vi.useRealTimers();
    f.disable();
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("revoked");
    expect(
      screen.queryByLabelText("Teaching biography"),
    ).not.toBeInTheDocument();
  });
  it("drops pending private content on account switch and revoked access", async () => {
    const f = fixture();
    let finish!: (value: TutorSnapshot) => void;
    vi.mocked(f.access.tutor.load).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    openAccount(f.access, "/studio");
    await screen.findByText("Loading your tutor records…");
    await act(async () => {
      f.emit("SIGNED_OUT", null);
    });
    await screen.findByRole("heading", { name: "Welcome back." });
    await act(async () =>
      finish({
        ...f.records,
        profile: { ...f.records.profile, bio: "Old account private content" },
      }),
    );
    expect(
      screen.queryByText("Old account private content"),
    ).not.toBeInTheDocument();
  });
});
describe("tutor display validation", () => {
  it.each([
    ["pending", "Pending trusted review"],
    ["approved", "Approved in test records"],
    ["rejected", "Rejected in test records"],
    ["revoked", "Revoked in test records"],
    [undefined, "Verification not started"],
  ])("labels %s truthfully", (status, label) =>
    expect(verificationLabel(status)).toBe(label),
  );
  it.each([
    ["16:00", "16:14"],
    ["16:00", "20:01"],
    ["23:00", "24:00"],
    ["invalid", "17:00"],
    ["16:70", "18:00"],
  ])("rejects invalid bounds %s–%s", (starts_at, ends_at) =>
    expect(validateInterval({ weekday: 1, starts_at, ends_at }, [])).not.toBe(
      "",
    ),
  );
});
