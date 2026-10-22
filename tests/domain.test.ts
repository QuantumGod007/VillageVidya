import { describe, it, expect } from "vitest";
import {
  displayScore,
  calculateMatch,
  rankTutors,
  isEligible,
  sessionScore,
  updateTSS,
  tierFor,
  progression,
  expireRequest,
  canTransition,
  canAccess,
  redactContact,
  profileSchema,
  mastery,
} from "../src/domain/learning";
import { sampleEvaluation, tutors } from "../src/data/demo";
import type { MatchRequest } from "../src/domain/types";
describe("SRS weighted matching and trust boundaries", () => {
  it("uses the exact four CMS weights and normalizes TSS", () => {
    expect(
      calculateMatch(tutors[0], "Mathematics", "English").score,
    ).toBeCloseTo(98.4);
  });
  it("makes a language mismatch visible in the calculation", () => {
    expect(
      calculateMatch(tutors[0], "Mathematics", "తెలుగు").score,
    ).toBeCloseTo(68.4);
  });
  it("does not confuse being verified with being available now", () => {
    expect(
      calculateMatch(tutors[2], "Science", "English").factors.availability,
    ).toBe(0);
  });
  it.each([{ verified: false }, { tss: 49.99 }, { grade: 7 }])(
    "blocks ineligible tutors even with an otherwise high match: %j",
    (change) => {
      expect(isEligible({ ...tutors[0], ...change }, 8, "Mathematics")).toBe(
        false,
      );
    },
  );
  it("enforces subjects and inclusive verified grade boundary", () => {
    expect(isEligible(tutors[0], 11, "Mathematics")).toBe(true);
    expect(isEligible(tutors[0], 12, "Mathematics")).toBe(false);
    expect(isEligible(tutors[0], 8, "English")).toBe(false);
  });
  it("includes only eligible ranked tutors", () => {
    const ranked = rankTutors(
      [...tutors, { ...tutors[0], id: "unsafe", verified: false, tss: 100 }],
      8,
      "Mathematics",
      "English",
    );
    expect(ranked.map((r) => r.tutor.id)).toEqual(["aditi", "rohan", "ishaan"]);
  });
});
describe("Co-Teacher and skill ladder", () => {
  it("computes the five-dimension session score", () => {
    expect(sessionScore(sampleEvaluation)).toBeCloseTo(91.7);
  });
  it("uses a 0.85 / 0.15 exponential moving average", () => {
    expect(updateTSS(92, 91.7)).toBeCloseTo(91.955);
  });
  it.each([
    [50, 0, "Helper"],
    [70, 5, "Explainer"],
    [82, 24, "Explainer"],
    [82, 25, "Mentor"],
    [90, 38, "Village Guide"],
  ] as const)(
    "TSS %s and %s sessions qualify for %s",
    (score, sessions, tier) => {
      expect(tierFor(score, sessions)).toBe(tier);
    },
  );
  it("allows three coaching sessions before demotion", () => {
    expect(progression(80, 40, "Mentor", 0).tier).toBe("Mentor");
    expect(progression(80, 40, "Mentor", 2).tier).toBe("Mentor");
    expect(progression(80, 40, "Mentor", 3).tier).toBe("Explainer");
  });
  it("does not use grace to override the TSS safety floor", () => {
    expect(
      isEligible(
        { ...tutors[0], tss: 49, tier: "Village Guide" },
        8,
        "Mathematics",
      ),
    ).toBe(false);
  });
});
describe("session, account and privacy invariants", () => {
  const request: MatchRequest = {
    id: "1",
    tutorId: "aditi",
    subject: "Mathematics",
    topic: "Fractions",
    status: "pending",
    createdAt: 1000,
    scheduled: null,
  };
  it("expires unanswered requests at 45 seconds", () => {
    expect(expireRequest(request, 45999).status).toBe("pending");
    expect(expireRequest(request, 46000).status).toBe("expired");
  });
  it("never expires an accepted request", () => {
    expect(
      expireRequest({ ...request, status: "accepted" }, 100000).status,
    ).toBe("accepted");
  });
  it("allows reconnection but never reopens a terminal session", () => {
    expect(canTransition("active", "reconnecting")).toBe(true);
    expect(canTransition("reconnecting", "active")).toBe(true);
    expect(canTransition("completed", "active")).toBe(false);
    expect(canTransition("terminated", "completed")).toBe(false);
  });
  it("enforces role-specific pages", () => {
    expect(canAccess(null, ["learner"])).toBe(false);
    expect(canAccess("guardian", ["tutor"])).toBe(false);
    expect(canAccess("tutor", ["tutor"])).toBe(true);
  });
  it("redacts common contacts before display", () => {
    const value = redactContact(
      "Call +91 98765 43210 or test@example.com at https://example.com",
    );
    expect(value).not.toContain("98765");
    expect(value).not.toContain("test@example.com");
    expect(value).not.toContain("https://");
  });
  it("requires an explicit fictional profile acknowledgement", () => {
    const valid = {
      grade: 8,
      language: "English",
      subject: "Mathematics",
      fictionalOnly: true,
    };
    expect(profileSchema.safeParse(valid).success).toBe(true);
    expect(
      profileSchema.safeParse({ ...valid, fictionalOnly: false }).success,
    ).toBe(false);
    expect(profileSchema.safeParse({ ...valid, grade: 3 }).success).toBe(false);
    expect(profileSchema.safeParse({ ...valid, grade: 13 }).success).toBe(
      false,
    );
  });
  it("keeps topic mastery between 0 and 100", () => {
    expect(mastery(2, 4)).toBe(50);
    expect(mastery(5, 4)).toBe(100);
    expect(mastery(0, 0)).toBe(0);
  });
});

describe("persisted versus terminal request states", () => {
  it("keeps a cancelled match terminal", () => {
    const request: MatchRequest = {
      id: "cancelled",
      tutorId: "aditi",
      subject: "Mathematics",
      topic: "Fractions",
      status: "cancelled",
      createdAt: 0,
      scheduled: null,
    };
    expect(expireRequest(request, 100000).status).toBe("cancelled");
  });
});

it("displays the TSS EMA without binary rounding artefacts", () => {
  expect(displayScore(updateTSS(92, 91.7), 2)).toBe("91.96");
});
