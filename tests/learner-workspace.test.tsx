import { describe, it, expect, vi } from "vitest";
import { act, screen, waitFor, renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { curriculum } from "../src/data/curriculum";
import { setupAccount, openAccount } from "./helpers/account-fixture";
import { useLearnerWorkspace } from "../src/lib/data-access/use-learner-workspace";
import type { Tables } from "../src/lib/data-access/database.types";
const uid = "00000000-0000-0000-0000-000000000001";
const now = "2026-10-24T00:00:00Z";
function fixture(enrolled = true) {
  const f = setupAccount("learner");
  const state: {
    enrollments: Tables<"learner_academic_enrollments">[];
    bookmarks: Tables<"learner_bookmarks">[];
    activity: Tables<"learner_lesson_activity">[];
  } = {
    enrollments: enrolled
      ? [
          {
            id: "active",
            learner_id: uid,
            subject_id: "cbse-8-mathematics",
            language: "English",
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]
      : [],
    bookmarks: [],
    activity: [],
  };
  vi.mocked(f.access.curriculum.load).mockResolvedValue(curriculum);
  vi.mocked(f.access.learner.enrollments).mockImplementation(async () =>
    structuredClone(state.enrollments),
  );
  vi.mocked(f.access.learner.bookmarks).mockImplementation(async () =>
    structuredClone(state.bookmarks),
  );
  vi.mocked(f.access.learner.activity).mockImplementation(async () =>
    structuredClone(state.activity),
  );
  vi.mocked(f.access.learner.enroll).mockImplementation(
    async (subject_id, language) => {
      state.enrollments = state.enrollments.map((e) => ({
        ...e,
        is_active: false,
      }));
      state.enrollments.push({
        id: subject_id,
        learner_id: uid,
        subject_id,
        language,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    },
  );
  vi.mocked(f.access.learner.setBookmark).mockImplementation(
    async (lesson_id, saved) => {
      state.bookmarks = state.bookmarks.filter(
        (b) => b.lesson_id !== lesson_id,
      );
      if (saved)
        state.bookmarks.push({ learner_id: uid, lesson_id, created_at: now });
    },
  );
  vi.mocked(f.access.learner.recordReading).mockImplementation(
    async (lesson_id, read) => {
      const previous = state.activity.find((a) => a.lesson_id === lesson_id);
      state.activity = state.activity.filter((a) => a.lesson_id !== lesson_id);
      state.activity.push({
        learner_id: uid,
        lesson_id,
        started_at: previous?.started_at ?? now,
        read_at: previous?.read_at ?? (read ? now : null),
      });
    },
  );
  return { ...f, state };
}
describe("persistent learner UI (mocked repositories; real RLS/API tests run in CI)", () => {
  it("restores active context and filters the library without other-grade lessons", async () => {
    const f = fixture();
    openAccount(f.access, "/explore");
    expect(
      await screen.findByRole("link", { name: /Keeping the balance/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/CBSE · Grade 8 · Mathematics · English/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Fractions, made familiar/ }),
    ).not.toBeInTheDocument();
  });
  it("persists academic selection, exposes coverage gaps and keeps records", async () => {
    const user = userEvent.setup();
    const f = fixture(false);
    f.state.bookmarks = [
      { learner_id: uid, lesson_id: "equations", created_at: now },
    ];
    openAccount(f.access, "/settings");
    await user.selectOptions(
      await screen.findByLabelText("Learner grade"),
      "4",
    );
    expect(
      screen.getByText(/No published subjects for this board and grade/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save academic selection" }),
    ).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Learner grade"), "10");
    await user.selectOptions(
      screen.getByLabelText("Subject"),
      "cbse-10-mathematics",
    );
    await user.click(
      screen.getByRole("button", { name: "Save academic selection" }),
    );
    expect(
      await screen.findByText("Academic selection saved to your account."),
    ).toBeInTheDocument();
    expect(f.access.learner.enroll).toHaveBeenCalledWith(
      "cbse-10-mathematics",
      "English",
    );
    expect(f.state.bookmarks).toHaveLength(1);
    await user.selectOptions(
      screen.getByLabelText("Academic board"),
      "maharashtra",
    );
    await user.selectOptions(screen.getByLabelText("Learner grade"), "10");
    expect(
      screen.getByText(/No published subjects for this board and grade/),
    ).toBeInTheDocument();
    expect(f.state.enrollments.find((e) => e.is_active)?.subject_id).toBe(
      "cbse-10-mathematics",
    );
  });
  it("waits for bookmark confirmation and ignores duplicate clicks", async () => {
    const user = userEvent.setup();
    const f = fixture();
    let resolve!: () => void;
    const pending = new Promise<void>((r) => (resolve = r));
    const original = vi
      .mocked(f.access.learner.setBookmark)
      .getMockImplementation()!;
    vi.mocked(f.access.learner.setBookmark).mockImplementationOnce(
      async (...args) => {
        await pending;
        await original(...args);
      },
    );
    openAccount(f.access, "/explore");
    const button = await screen.findByRole("button", {
      name: "Save Keeping the balance",
    });
    await user.dblClick(button);
    expect(f.access.learner.setBookmark).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(
      screen.queryByText("Lesson saved to your account."),
    ).not.toBeInTheDocument();
    await act(async () => resolve());
    expect(
      await screen.findByText("Lesson saved to your account."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Saved lessons · 1" }));
    expect(
      await screen.findByRole("button", { name: "Unsave Keeping the balance" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Unsave Keeping the balance" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "A place for lessons you want to revisit.",
      }),
    ).toBeInTheDocument();
  });
  it("reports failed saves without changing counts and supports refresh/retry", async () => {
    const user = userEvent.setup();
    const f = fixture();
    vi.mocked(f.access.learner.setBookmark).mockRejectedValueOnce(
      new Error("Could not change this bookmark."),
    );
    openAccount(f.access, "/explore");
    await user.click(
      await screen.findByRole("button", { name: "Save Keeping the balance" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not change this bookmark",
    );
    expect(f.state.bookmarks).toHaveLength(0);
    expect(
      screen.queryByText("Lesson saved to your account."),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refresh records" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save Keeping the balance" }),
      ).toBeEnabled(),
    );
    await user.click(
      screen.getByRole("button", { name: "Save Keeping the balance" }),
    );
    expect(
      await screen.findByText("Lesson saved to your account."),
    ).toBeInTheDocument();
  });
  it("records a start on opening, then self-reported read activity without scoring", async () => {
    const user = userEvent.setup();
    const f = fixture();
    openAccount(f.access, "/lesson/equations");
    expect(
      await screen.findByText("Reading started. No score was awarded."),
    ).toBeInTheDocument();
    expect(f.access.learner.recordReading).toHaveBeenCalledWith(
      "equations",
      false,
    );
    await user.click(screen.getByRole("button", { name: "Mark as read" }));
    expect(
      await screen.findByRole("button", { name: "Read · self-reported" }),
    ).toBeDisabled();
    expect(f.access.learner.recordReading).toHaveBeenCalledWith(
      "equations",
      true,
    );
    await user.click(screen.getByRole("link", { name: "Progress" }));
    expect(
      await screen.findByText(/1 started · 1 marked as read · 0 saved/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No trusted checkpoint results yet/),
    ).toBeInTheDocument();
  });
  it("shows an empty library for an unavailable language and never recommends a fallback", async () => {
    const f = fixture();
    f.state.enrollments[0].language = "हिन्दी";
    openAccount(f.access, "/explore");
    expect(
      await screen.findByRole("heading", {
        name: "No lessons for this selection yet.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Keeping the balance/ }),
    ).not.toBeInTheDocument();
  });
  it("never records activity for a missing or unpublished lesson", async () => {
    const f = fixture();
    openAccount(f.access, "/lesson/missing");
    expect(
      await screen.findByRole("heading", { name: "Resource unavailable." }),
    ).toBeInTheDocument();
    expect(f.access.learner.recordReading).not.toHaveBeenCalled();
  });
  it("ignores older fetches and clears another account's pending response", async () => {
    const first = fixture();
    let resolve!: (value: typeof curriculum) => void;
    vi.mocked(first.access.curriculum.load).mockImplementationOnce(
      () => new Promise((r) => (resolve = r)),
    );
    const { result, rerender } = renderHook(
      ({ access }) => useLearnerWorkspace(access),
      { initialProps: { access: first.access } },
    );
    const second = fixture(false);
    rerender({ access: second.access });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.enrollments).toHaveLength(0);
    await act(async () => resolve(curriculum));
    expect(result.current.data?.enrollments).toHaveLength(0);
  });
  it("locks context controls during a pending atomic switch", async () => {
    const user = userEvent.setup();
    const f = fixture();
    let finish!: () => void;
    const wait = new Promise<void>((r) => (finish = r));
    const original = vi
      .mocked(f.access.learner.enroll)
      .getMockImplementation()!;
    vi.mocked(f.access.learner.enroll).mockImplementationOnce(
      async (...args) => {
        await wait;
        await original(...args);
      },
    );
    openAccount(f.access, "/settings");
    await user.selectOptions(
      await screen.findByLabelText("Learner grade"),
      "6",
    );
    await user.selectOptions(
      screen.getByLabelText("Subject"),
      "cbse-6-mathematics",
    );
    await user.click(
      screen.getByRole("button", { name: "Save academic selection" }),
    );
    expect(screen.getByLabelText("Subject")).toBeDisabled();
    expect(screen.getByLabelText("Learner grade")).toBeDisabled();
    expect(f.state.enrollments.find((e) => e.is_active)?.subject_id).toBe(
      "cbse-8-mathematics",
    );
    await act(async () => finish());
    expect(
      await screen.findByText("Academic selection saved to your account."),
    ).toBeInTheDocument();
    expect(f.state.enrollments.find((e) => e.is_active)?.subject_id).toBe(
      "cbse-6-mathematics",
    );
  });
});
