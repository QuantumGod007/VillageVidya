import { useEffect, useRef, useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../src/app-routes";
import { StoreProvider, useStore } from "../src/lib/store";
import { lessons, sampleEvaluation } from "../src/data/demo";
import {
  nextLesson,
  openSessions,
  nextPlannedSession,
  plannedTime,
} from "../src/domain/dashboard";
import type { MatchRequest, CompletedSession, Role } from "../src/domain/types";
const now = Date.parse("2026-10-22T04:30:00Z"); // 10:00 IST
const planned = (id: string, slot: string): MatchRequest => ({
  id,
  tutorId: "aditi",
  subject: "Mathematics",
  topic: "Fractions, made familiar",
  status: "accepted",
  scheduled: slot,
  createdAt: now,
});
const finished: CompletedSession = {
  id: "done",
  tutorId: "aditi",
  topic: "Fractions, made familiar",
  date: now,
  minutes: 12,
  elic: 1,
  rating: 5,
  evaluation: sampleEvaluation,
};
describe("dashboard priorities", () => {
  it("prefers in-progress work in the chosen subject, then an unstarted lesson in that subject", () => {
    expect(
      nextLesson(
        lessons,
        { fractions: 50, photosynthesis: 0, water: 25 },
        { boardId: "cbse", grade: 6, subject: "Science", language: "English" },
      )?.id,
    ).toBe("water");
    expect(
      nextLesson(
        lessons,
        { fractions: 50, photosynthesis: 0, water: 0 },
        { boardId: "cbse", grade: 6, subject: "Science", language: "English" },
      )?.id,
    ).toBe("water");
  });
  it("handles a completed subject and a fully completed library honestly", () => {
    expect(
      nextLesson(
        lessons,
        { fractions: 50, photosynthesis: 100, water: 100 },
        { boardId: "cbse", grade: 6, subject: "Science", language: "English" },
      )?.id,
    ).toBeUndefined();
    expect(
      nextLesson(
        lessons,
        Object.fromEntries(lessons.map((lesson) => [lesson.id, 100])),
        { boardId: "cbse", grade: 6, subject: "Science", language: "English" },
      ),
    ).toBeUndefined();
  });
  it("excludes completed, cancelled and other tutors’ sessions from tutor next actions", () => {
    const requests = [
      planned("done", "Tomorrow, 4:00 PM"),
      {
        ...planned("cancelled", "Tomorrow, 4:00 PM"),
        status: "cancelled" as const,
      },
      { ...planned("other", "Tomorrow, 4:00 PM"), tutorId: "rohan" },
      planned("open", "Tomorrow, 4:00 PM"),
    ];
    expect(
      openSessions(requests, [finished], "aditi").map((session) => session.id),
    ).toEqual(["open"]);
  });
  it("orders real accepted demo slot labels in IST, without mutating requests", () => {
    const sessions = [
      planned("tomorrow", "Tomorrow, 4:00 PM"),
      planned("later", "Today, 6:00 PM"),
      planned("first", "Today, 5:30 PM"),
    ];
    expect(nextPlannedSession(sessions, now)?.id).toBe("first");
    expect(plannedTime(sessions[2])).toBe(Date.parse("2026-10-22T12:00:00Z"));
    expect(sessions[0].id).toBe("tomorrow");
  });
  it("never presents expired or unparseable labels as an upcoming appointment", () => {
    expect(
      nextPlannedSession(
        [planned("past", "Today, 8:00 AM"), planned("unknown", "Some day")],
        now,
      ),
    ).toBeUndefined();
    expect(plannedTime(planned("saturday", "Saturday, 10:00 AM"))).toBe(
      Date.parse("2026-10-24T04:30:00Z"),
    );
  });
});
function Prepared({
  mode,
  children,
}: {
  mode?: "ready" | "completed" | "scheduled" | "science" | "complete";
  children: React.ReactNode;
}) {
  const store = useStore();
  const initialized = useRef(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (mode === "science")
      store.setPreferences({
        subject: "Science",
        grade: 7,
        language: "English",
      });
    if (mode === "complete")
      lessons.forEach((lesson) => store.completeLesson(lesson.id, 100));
    if (mode === "ready" || mode === "completed" || mode === "scheduled") {
      const request = store.request(
        "aditi",
        "Mathematics",
        "Fractions, made familiar",
        mode === "scheduled" ? "Tomorrow, 4:00 PM" : undefined,
      );
      store.updateRequest(request.id, "accepted");
      if (mode === "completed")
        store.finishSession({ ...finished, id: request.id, date: Date.now() });
    }
    setReady(true);
  }, [mode, store]);
  return ready ? children : null;
}
function open(
  role: Role,
  route: string,
  mode?: Parameters<typeof Prepared>[0]["mode"],
) {
  sessionStorage.setItem(
    "vv-demo-role",
    JSON.stringify({ role, expires: Date.now() + 900000 }),
  );
  return render(
    <MemoryRouter initialEntries={[route]}>
      <StoreProvider>
        <Prepared mode={mode}>
          <AppRoutes />
        </Prepared>
      </StoreProvider>
    </MemoryRouter>,
  );
}
describe("role dashboard journeys", () => {
  it("personalizes context and recommends only the selected grade and subject", async () => {
    open("learner", "/learn", "science");
    expect(
      await screen.findByRole("heading", { name: "A leaf’s little kitchen" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("CBSE · Grade 7", { exact: true }),
    ).toBeInTheDocument();
    expect(screen.getByText("Science", { exact: true })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue learning" }),
    ).toHaveAttribute("href", "/lesson/photosynthesis");
    expect(
      screen.getByText(/progress for the selected academic context/),
    ).toBeInTheDocument();
  });
  it("does not invent recent activity or an upcoming session from seeded progress", async () => {
    open("learner", "/learn");
    expect(
      await screen.findByText("A fresh page for this visit."),
    ).toBeInTheDocument();
    expect(screen.getByText("No upcoming session.")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Upcoming session" }),
    ).not.toBeInTheDocument();
  });
  it("places an accepted ready room above a lesson suggestion", async () => {
    open("learner", "/learn", "ready");
    expect(
      await screen.findByRole("heading", {
        name: "Your peer is ready to help.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Join practice" })).toHaveAttribute(
      "href",
      expect.stringContaining("/room/"),
    );
    expect(
      screen.queryByRole("link", { name: "Continue learning" }),
    ).not.toBeInTheDocument();
  });
  it("shows only a real accepted future session plan and links to its details", async () => {
    open("learner", "/learn", "scheduled");
    expect(
      await screen.findByRole("heading", { name: /Upcoming session/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tomorrow, 4:00 PM IST/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View session" })).toHaveAttribute(
      "href",
      "/sessions",
    );
  });
  it("uses the all-complete state instead of inventing another unfinished lesson", async () => {
    open("learner", "/learn", "complete");
    expect(
      await screen.findByRole("heading", {
        name: "You’ve completed these practice checkpoints.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Review the library" }),
    ).toHaveAttribute("href", "/explore");
  });
  it("records actual checkpoint attempts in visit activity while retaining best saved progress", async () => {
    const user = userEvent.setup();
    open("learner", "/learn");
    await user.click(
      await screen.findByRole("link", { name: "Continue learning" }),
    );
    await user.click(await screen.findByRole("radio", { name: /12/ }));
    await user.click(
      screen.getByRole("button", { name: "Check my understanding" }),
    );
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Workspace navigation" }),
      ).getByRole("link", { name: "Overview" }),
    );
    expect(
      await screen.findByText("Checkpoint attempted · keep practising"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", {
        name: "Keeping the balance progress",
      }),
    ).toHaveAttribute("aria-valuenow", "25");
    expect(
      JSON.parse(localStorage.getItem("village-vidya-fictional-demo-v1")!),
    ).not.toHaveProperty("learningActivity");
  });
  it("starts a tutor with truthful empty states and creates a pending request only on an explicit action", async () => {
    const user = userEvent.setup();
    open("tutor", "/studio");
    expect(await screen.findByText("No pending requests.")).toBeInTheDocument();
    expect(
      screen.getByText("No teaching activity this visit."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No feedback from this visit yet."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Accept & join" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Create sample request" }),
    );
    expect(
      await screen.findByRole("button", { name: "Accept & join" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Decline" }));
    expect(await screen.findByText("No pending requests.")).toBeInTheDocument();
  });
  it("connects a sample request to the existing room and ELIC workflow", async () => {
    const user = userEvent.setup();
    open("tutor", "/studio");
    await user.click(
      await screen.findByRole("button", { name: "Create sample request" }),
    );
    await user.click(screen.getByRole("button", { name: "Accept & join" }));
    await user.click(
      await screen.findByRole("button", { name: /I’m confused/ }),
    );
    expect(
      await screen.findByText("Your learner is a little stuck."),
    ).toBeInTheDocument();
    expect(screen.getByRole("log")).toHaveTextContent(
      "ELIC: please try a simpler explanation.",
    );
  });

  it("removes a safety-stopped room from the dashboard’s ready action", async () => {
    const user = userEvent.setup();
    open("learner", "/learn", "ready");
    await user.click(
      await screen.findByRole("link", { name: "Join practice" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Report a concern" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Stop this practice session" }),
    );
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Workspace navigation" }),
      ).getByRole("link", { name: "Overview" }),
    );
    expect(
      await screen.findByRole("link", { name: "Continue learning" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Join practice" }),
    ).not.toBeInTheDocument();
  });
  it("keeps availability synchronized with tutor discovery state and gives feedback", async () => {
    const user = userEvent.setup();
    open("tutor", "/studio");
    await user.click(
      await screen.findByRole("switch", {
        name: "Available for demo tutoring",
      }),
    );
    expect(screen.getByRole("switch")).not.toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Demo availability is paused.",
    );
    expect(
      JSON.parse(localStorage.getItem("village-vidya-fictional-demo-v1")!)
        .available,
    ).toBe(false);
  });
  it("uses completed visit state for teaching activity and sample evaluation, without reopening that room", async () => {
    open("tutor", "/studio", "completed");
    expect(
      await screen.findByText("A practice lesson to reflect on."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("12 min practice · 1 confusion checkpoint"),
    ).toBeInTheDocument();
    expect(screen.getByText(/not live AI analysis/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Join practice" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Read sample feedback" }),
    ).toHaveAttribute("href", "/studio/feedback");
  });
  it("clears activity on logout while preserving saved checkpoint progress", async () => {
    const user = userEvent.setup();
    open("learner", "/learn", "complete");
    await user.click(await screen.findByRole("button", { name: "Leave demo" }));
    await user.click(
      await screen.findByRole("button", { name: "Explore as Aarav" }),
    );
    expect(
      await screen.findByText("A fresh page for this visit."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText("You’ve completed these practice checkpoints."),
      ).toBeInTheDocument(),
    );
  });
});
