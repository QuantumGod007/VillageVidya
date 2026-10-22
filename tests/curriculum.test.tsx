import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { lessons, tutors } from "../src/data/demo";
import { curriculum, demoCurriculumRepository } from "../src/data/curriculum";
import {
  academicContextSchema,
  chaptersFor,
  lessonsFor,
  progressFor,
  readAcademicContext,
  validateCatalog,
  type AcademicContext,
} from "../src/domain/curriculum";
import { nextLesson } from "../src/domain/dashboard";
import { isEligible, profileSchema } from "../src/domain/learning";
import { StoreProvider, useStore } from "../src/lib/store";
import { Explore, LessonPage } from "../src/features/learning";
import { Assistant } from "../src/features/assistant";
import { LearningProgress } from "../src/features/workspace-indexes";
import { Tutors } from "../src/features/tutors";
const base: AcademicContext = {
  boardId: "cbse",
  grade: 8,
  subject: "Mathematics",
  language: "English",
};
const key = "village-vidya-fictional-demo-v1";
function prefs(context: Partial<AcademicContext> = {}) {
  localStorage.setItem(
    key,
    JSON.stringify({
      ...base,
      progress: { fractions: 50, equations: 25 },
      saved: ["fractions", "equations"],
      available: true,
      lowData: true,
      goal: false,
      approved: [],
      ...context,
    }),
  );
}
function open(route = "/explore") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <StoreProvider>
        <RequestSnapshot />
        <Routes>
          <Route path="/explore" element={<Explore />} />
          <Route path="/lesson/:id" element={<LessonPage />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/learn/progress" element={<LearningProgress />} />
          <Route path="/tutors" element={<Tutors />} />
        </Routes>
      </StoreProvider>
    </MemoryRouter>,
  );
}
function RequestSnapshot() {
  const { requests } = useStore();
  return (
    <output aria-label="Latest request">
      {JSON.stringify(requests.at(-1) ?? null)}
    </output>
  );
}
describe("academic domain and catalog integrity", () => {
  it("accepts inclusive learner boundaries without changing verified tutor grades", () => {
    for (const grade of [4, 10])
      expect(academicContextSchema.safeParse({ ...base, grade }).success).toBe(
        true,
      );
    for (const grade of [3, 11, 12, 8.5])
      expect(academicContextSchema.safeParse({ ...base, grade }).success).toBe(
        false,
      );
    expect(
      profileSchema.safeParse({ ...base, grade: 11, fictionalOnly: true })
        .success,
    ).toBe(false);
    expect(tutors[0].grade).toBe(11);
    expect(isEligible(tutors[0], 10, "Mathematics")).toBe(true);
    expect(isEligible({ ...tutors[0], grade: 9 }, 10, "Mathematics")).toBe(
      false,
    );
  });
  it("validates every hierarchy relationship, stable ID and assessment", async () => {
    expect(validateCatalog(await demoCurriculumRepository.load())).toEqual([]);
    expect(chaptersFor(curriculum, base).map((c) => c.title)).toEqual([
      "Linear Equations in One Variable",
    ]);
    expect(
      validateCatalog({
        ...curriculum,
        lessons: [{ ...lessons[0], chapterId: "missing" }],
      }),
    ).toContain("Invalid lesson fractions");
    expect(
      validateCatalog({
        ...curriculum,
        lessons: [...lessons, { ...lessons[0], grade: 10 }],
      }),
    ).toContain("Duplicate stable ID");
    expect(
      validateCatalog({
        ...curriculum,
        assessments: curriculum.assessments.map((a, i) =>
          i ? a : { ...a, answer: 99 },
        ),
      }),
    ).toContain("Invalid assessment fractions-checkpoint");
  });
  it("filters board, grade, subject and language and never recommends an unrelated fallback", () => {
    expect(lessonsFor(lessons, base).map((l) => l.id)).toEqual(["equations"]);
    expect(
      lessonsFor(lessons, { ...base, grade: 10 }).map((l) => l.id),
    ).toEqual(["prime-factors", "hcf-lcm"]);
    for (const context of [
      { ...base, grade: 4 as const },
      { ...base, boardId: "maharashtra" as const },
      { ...base, subject: "Science" as const },
      { ...base, language: "हिन्दी" as const },
    ]) {
      expect(lessonsFor(lessons, context)).toEqual([]);
      expect(nextLesson(lessons, { fractions: 50 }, context)).toBeUndefined();
    }
    expect(
      nextLesson(lessons, { equations: 100, fractions: 50 }, base),
    ).toBeUndefined();
    expect(
      nextLesson(lessons, { "prime-factors": 100 }, { ...base, grade: 10 })?.id,
    ).toBe("hcf-lcm");
  });
  it("scopes saved counts and progress denominator to eligible records", () => {
    expect(
      progressFor(
        lessonsFor(lessons, base),
        { equations: 100, fractions: 50 },
        ["fractions", "equations", "unknown"],
      ),
    ).toEqual({ total: 1, complete: 1, percent: 100, saved: 1 });
    expect(progressFor([], { fractions: 100 }, ["fractions"])).toEqual({
      total: 0,
      complete: 0,
      percent: 0,
      saved: 0,
    });
    expect(
      readAcademicContext(new URLSearchParams("grade=99&board=invalid"), base),
    ).toEqual(base);
  });
});
describe("academic learning journeys", () => {
  it("switches grade and board, filters chapters and search, and preserves saved work", async () => {
    prefs();
    const user = userEvent.setup();
    open();
    expect(
      screen.getByRole("link", { name: "Study Keeping the balance" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Study Fractions, made familiar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Saved lessons (1)" }),
    ).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Grade" }),
      "10",
    );
    await user.click(screen.getByRole("button", { name: "Real Numbers" }));
    await user.type(
      screen.getByRole("textbox", { name: "Search lessons" }),
      "common",
    );
    expect(
      screen.getByRole("link", { name: "Study Finding common ground" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: "Study The building blocks of a number",
      }),
    ).not.toBeInTheDocument();
    await user.clear(screen.getByRole("textbox", { name: "Search lessons" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Board" }),
      "maharashtra",
    );
    expect(
      screen.getByText("Your curriculum has room to grow."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Find a tutor for this grade" }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("board=maharashtra&grade=10"),
    );
    const stored = JSON.parse(localStorage.getItem(key)!);
    expect(stored.progress.fractions).toBe(50);
    expect(stored.saved).toContain("fractions");
  });
  it("blocks mismatched and invalid lesson routes; requires an explicit context change", async () => {
    prefs();
    const user = userEvent.setup();
    const view = open("/lesson/fractions");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(
      screen.getByText("This lesson belongs to another academic context."),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Study in this lesson’s context" }),
    );
    expect(
      screen.getByRole("radio", { name: /3\/4 of a roti/ }),
    ).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(key)!).grade).toBe(6);
    view.unmount();
    open("/lesson/not-real");
    expect(
      screen.getByText("This lesson hasn’t arrived yet."),
    ).toBeInTheDocument();
  });
  it("connects Grade 10 chapter, lesson, assessment and next lesson", async () => {
    prefs({ grade: 10 });
    const user = userEvent.setup();
    open("/lesson/prime-factors");
    expect(
      screen.getByRole("navigation", { name: "Academic breadcrumb" }),
    ).toHaveTextContent("Real Numbers");
    await user.click(screen.getByRole("radio", { name: /2² × 3 × 7/ }));
    await user.click(
      screen.getByRole("button", { name: "Check my understanding" }),
    );
    expect(
      JSON.parse(localStorage.getItem(key)!).progress["prime-factors"],
    ).toBe(100);
    await user.click(
      screen.getByRole("link", { name: /Next: Finding common ground/ }),
    );
    expect(
      screen.getByRole("heading", { name: "Finding common ground" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Lesson mastery" }),
    ).toHaveAttribute("aria-valuenow", "0");
  });
  it("shows missing Grade 4 content and no unrelated progress", () => {
    prefs({ grade: 4 });
    open("/learn/progress");
    expect(screen.getByText(/No checkpoint records/)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
  it("keeps the AI demo inside its context even for mismatched topic links", async () => {
    prefs();
    const user = userEvent.setup();
    open("/assistant?topic=fractions");
    expect(
      screen.getByRole("textbox", { name: "Your learning question" }),
    ).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: /understand Fractions/ }),
    ).not.toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Your learning question" }),
      "Explain fractions",
    );
    await user.click(screen.getByRole("button", { name: "Ask question" }));
    expect(
      await screen.findByText("A good question needs a grounded answer."),
    ).toBeInTheDocument();
  });
  it("does not label untranslated English content as a regional-language lesson", () => {
    prefs({ language: "मराठी" });
    open();
    expect(screen.getByText(/No lessons in मराठी yet/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Study Keeping the balance" }),
    ).not.toBeInTheDocument();
  });
  it("preserves legacy checkpoint and saved IDs when migrating Grade 12 preferences", () => {
    prefs();
    const raw = JSON.parse(localStorage.getItem(key)!);
    delete raw.boardId;
    raw.grade = 12;
    localStorage.setItem(key, JSON.stringify(raw));
    open();
    expect(screen.getByRole("combobox", { name: "Grade" })).toHaveValue("8");
    expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({
      boardId: "cbse",
      grade: 8,
      progress: { fractions: 50, equations: 25 },
      saved: ["fractions", "equations"],
    });
  });
  it("preserves the requested grade and lesson across a matching cascade", async () => {
    prefs();
    sessionStorage.setItem(
      "vv-demo-role",
      JSON.stringify({ role: "learner", expires: Date.now() + 900000 }),
    );
    const user = userEvent.setup();
    open(
      "/tutors?board=cbse&grade=10&subject=Mathematics&language=English&lesson=prime-factors",
    );
    await user.click(screen.getByRole("button", { name: "Meet Aditi" }));
    await user.click(
      screen.getByRole("button", { name: "Request a demo session" }),
    );
    await user.click(screen.getByRole("button", { name: "Simulate decline" }));
    expect(
      await screen.findByText("A little time with Rohan."),
    ).toBeInTheDocument();
    expect(
      JSON.parse(screen.getByLabelText("Latest request").textContent!),
    ).toMatchObject({
      tutorId: "rohan",
      academic: { grade: 10, boardId: "cbse" },
      lessonId: "prime-factors",
    });
    await user.click(screen.getByRole("button", { name: "Simulate decline" }));
    await user.click(screen.getByRole("button", { name: "Simulate decline" }));
    expect(
      await screen.findByText("No sample tutor accepted this request."),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Ask about Grade 10 Mathematics" }),
    );
    expect(
      screen.getByRole("button", {
        name: /Help me understand The building blocks/,
      }),
    ).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(key)!).grade).toBe(10);
  });
  it("carries context to matching without altering tutor academic eligibility", async () => {
    prefs();
    const user = userEvent.setup();
    open(
      "/tutors?board=cbse&grade=10&subject=Mathematics&language=English&lesson=prime-factors",
    );
    expect(screen.getByRole("combobox", { name: "Your grade" })).toHaveValue(
      "10",
    );
    expect(
      screen.getByText(/Seeking help for CBSE · Grade 10/),
    ).toHaveTextContent("The building blocks of a number");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Your grade" }),
      "4",
    );
    expect(
      screen.getByText(/Seeking help for CBSE · Grade 4/),
    ).toHaveTextContent("open question");
  });
});
function RequestProbe() {
  const store = useStore();
  return (
    <>
      <button
        onClick={() => {
          store.request("aditi", "Mathematics", "Keeping the balance");
          store.setPreferences({ grade: 10 });
        }}
      >
        Request then change grade
      </button>
      <output aria-label="Request context">
        {JSON.stringify(store.requests[0])}
      </output>
    </>
  );
}
it("snapshots request context instead of relabelling it after a preference change", async () => {
  prefs();
  const user = userEvent.setup();
  render(
    <StoreProvider>
      <RequestProbe />
    </StoreProvider>,
  );
  await user.click(
    screen.getByRole("button", { name: "Request then change grade" }),
  );
  const request = JSON.parse(
    within(screen.getByLabelText("Request context")).getByText(/academic/)
      .textContent!,
  );
  expect(request).toMatchObject({
    academic: { grade: 8, boardId: "cbse" },
    lessonId: "equations",
  });
});
