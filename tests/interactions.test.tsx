import { useEffect, useRef } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { StoreProvider, useStore } from "../src/lib/store";
import { LessonPage } from "../src/features/learning";
import { Auth } from "../src/features/auth";
import { Protected, Layout } from "../src/components/layout";
import { SessionRoom, Sessions } from "../src/features/session";
import { Assistant } from "../src/features/assistant";
import { Tutors } from "../src/features/tutors";
function Wrapper({
  children,
  route = "/",
}: {
  children: React.ReactNode;
  route?: string;
}) {
  if (route === "/lesson/fractions") {
    const prefs = JSON.parse(
      localStorage.getItem("village-vidya-fictional-demo-v1") || "{}",
    );
    localStorage.setItem(
      "village-vidya-fictional-demo-v1",
      JSON.stringify({
        grade: 6,
        language: "English",
        subject: "Mathematics",
        progress: { fractions: 50 },
        saved: [],
        available: true,
        lowData: true,
        goal: false,
        approved: [],
        ...prefs,
      }),
    );
  }
  return (
    <MemoryRouter initialEntries={[route]}>
      <StoreProvider>{children}</StoreProvider>
    </MemoryRouter>
  );
}
function PreparedRoom() {
  const store = useStore();
  const r = store.requests[0];
  return r ? (
    <MemoryRouter initialEntries={[`/room/${r.id}`]}>
      <Routes>
        <Route path="/room/:id" element={<SessionRoom />} />
      </Routes>
    </MemoryRouter>
  ) : (
    <Seed />
  );
}
function Seed() {
  const store = useStore();
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    store.login("learner");
    const r = store.request("aditi", "Mathematics", "Fractions, made familiar");
    store.updateRequest(r.id, "accepted");
  }, [store]);
  return null;
}
describe("learning and onboarding", () => {
  it("scores the checkpoint and saves a lesson, using actual local data", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper route="/lesson/fractions">
        <Routes>
          <Route path="/lesson/:id" element={<LessonPage />} />
        </Routes>
      </Wrapper>,
    );
    await user.click(screen.getByRole("radio", { name: /3\/4 of a roti/ }));
    await user.click(
      screen.getByRole("button", { name: /Check my understanding/ }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("That’s it.");
    expect(
      screen.getByRole("progressbar", { name: "Lesson mastery" }),
    ).toHaveAttribute("aria-valuenow", "100");
    await user.click(screen.getByRole("button", { name: "Save for later" }));
    expect(
      screen.getByRole("button", { name: "Saved on this device" }),
    ).toBeInTheDocument();
    const saved = JSON.parse(
      localStorage.getItem("village-vidya-fictional-demo-v1")!,
    );
    expect(saved.progress.fractions).toBe(100);
    expect(saved.saved).toContain("fractions");
  });
  it("explains a wrong answer without falsely awarding mastery", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper route="/lesson/fractions">
        <Routes>
          <Route path="/lesson/:id" element={<LessonPage />} />
        </Routes>
      </Wrapper>,
    );
    await user.click(screen.getByRole("radio", { name: /2\/6 of a roti/ }));
    await user.click(
      screen.getByRole("button", { name: /Check my understanding/ }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "A good place to try another way.",
    );
    expect(
      screen.getByRole("progressbar", { name: "Lesson mastery" }),
    ).toHaveAttribute("aria-valuenow", "50");
  });
  it("blocks progression until the demo acknowledgement is given", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <Routes>
          <Route path="/" element={<Auth onboarding />} />
          <Route path="/learn" element={<p>LEARNER WORKSPACE</p>} />
        </Routes>
      </Wrapper>,
    );
    await user.click(screen.getByRole("button", { name: /Explore as Aarav/ }));
    await user.click(
      screen.getByRole("button", { name: "Enter my learning space" }),
    );
    expect(
      await screen.findByText(
        "Please confirm you are exploring a fictional profile.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: "Enter my learning space" }),
    );
    expect(await screen.findByText("LEARNER WORKSPACE")).toBeInTheDocument();
  });
  it("keeps real registration closed", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <Auth />
      </Wrapper>,
    );
    await user.click(
      screen.getByRole("button", { name: /Have a real account/ }),
    );
    expect(
      screen.getByText("Real registration is not open yet."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /phone/i }),
    ).not.toBeInTheDocument();
  });
  it("redirects unauthorized routes to profile selection", () => {
    render(
      <Wrapper route="/studio">
        <Routes>
          <Route element={<Protected roles={["tutor"]} />}>
            <Route path="/studio" element={<p>PRIVATE TUTOR VIEW</p>} />
          </Route>
          <Route path="/login" element={<p>CHOOSE A PROFILE</p>} />
        </Routes>
      </Wrapper>,
    );
    expect(screen.getByText("CHOOSE A PROFILE")).toBeInTheDocument();
    expect(screen.queryByText("PRIVATE TUTOR VIEW")).not.toBeInTheDocument();
  });
  it("recovers safely from malformed local storage", () => {
    localStorage.setItem("village-vidya-fictional-demo-v1", '{"grade":-1}');
    render(
      <Wrapper>
        <Auth />
      </Wrapper>,
    );
    expect(
      screen.getByRole("button", { name: /Explore as Aarav/ }),
    ).toBeInTheDocument();
  });
});
describe("session and navigation interactions", () => {
  it("logs ELIC, nudges the tutor, and keeps typed messages out of persistent storage", async () => {
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <PreparedRoom />
      </StoreProvider>,
    );
    await user.click(
      await screen.findByRole("button", { name: /I’m confused/ }),
    );
    expect(
      screen.getByText("Your learner is a little stuck."),
    ).toBeInTheDocument();
    expect(screen.getByRole("log")).toHaveTextContent(
      "ELIC: please try a simpler explanation.",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Send message" }),
      ).toBeDisabled(),
    );
    await screen.findByText(/Let’s take a familiar example/);
    await user.type(
      screen.getByRole("textbox", { name: "Your message" }),
      "Call 9876543210",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(screen.getByRole("log")).toHaveTextContent("Call [contact removed]");
    expect(
      localStorage.getItem("village-vidya-fictional-demo-v1"),
    ).not.toContain("9876543210");
  });
  it("practises reconnection and restores the room", async () => {
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <PreparedRoom />
      </StoreProvider>,
    );
    await user.click(
      await screen.findByRole("button", { name: "Practice a connection drop" }),
    );
    expect(
      screen.getByText("A little pause. Your conversation is still here."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Your message" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(screen.getByRole("textbox", { name: "Your message" })).toBeEnabled();
    expect(screen.getByRole("log")).toHaveTextContent(
      "Practice connection restored.",
    );
  });
  it("opens a keyboard accessible navigation dialog", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<p>Test page</p>} />
          </Route>
        </Routes>
      </Wrapper>,
    );
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = screen.getByRole("dialog", { name: "A world to discover" });
    expect(
      within(dialog).getByRole("link", { name: "Explore" }),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Close dialog" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("filters tutor discovery to eligible subject profiles", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper route="/tutors?subject=Mathematics">
        <Tutors />
      </Wrapper>,
    );
    expect(screen.getByRole("heading", { name: /Aditi/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /Sana/ }),
    ).not.toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Search tutors" }),
      "no-such-person",
    );
    expect(
      screen.getByText("The right person is worth finding."),
    ).toBeInTheDocument();
  });
});

function PreparedSessions() {
  const store = useStore();
  return store.requests.length ? (
    <MemoryRouter>
      <Sessions />
    </MemoryRouter>
  ) : (
    <Seed />
  );
}
function TutorHarness() {
  const store = useStore();
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    store.login("learner");
  }, [store]);
  return <Tutors />;
}
describe("connected demo state regressions", () => {
  it("cancels an accepted session and removes its join action", async () => {
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <PreparedSessions />
      </StoreProvider>,
    );
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByRole("link", { name: "Join practice" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Good conversations start somewhere."),
    ).toBeInTheDocument();
  });
  it("cascades declined and expired invitations and then offers a grounded fallback", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper route="/tutors">
        <TutorHarness />
      </Wrapper>,
    );
    await user.click(screen.getByRole("button", { name: "Meet Aditi" }));
    await user.click(
      screen.getByRole("button", { name: "Request a demo session" }),
    );
    await user.click(screen.getByRole("button", { name: "Simulate decline" }));
    expect(
      await screen.findByText("A little time with Rohan."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Simulate timeout" }));
    expect(
      await screen.findByText("A little time with Ishaan."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Simulate decline" }));
    expect(
      await screen.findByText("No sample tutor accepted this request."),
    ).toBeInTheDocument();
  });
  it("withholds unsupported assistant answers and offers a human next step", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <Assistant />
      </Wrapper>,
    );
    await user.type(
      screen.getByRole("textbox", { name: "Your learning question" }),
      "Explain black holes",
    );
    await user.click(screen.getByRole("button", { name: "Ask question" }));
    expect(
      await screen.findByText("A good question needs a grounded answer."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Find a peer for tomorrow" }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("/tutors?board=cbse&grade=8"),
    );
  });
});
