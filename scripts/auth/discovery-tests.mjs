import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export async function testDiscoveryApi({
  discoveryRepo,
  tutorRepo,
  learner,
  otherLearner,
  tutor,
  otherTutor,
  guardian,
  champion,
  admin,
  anonymous,
  server,
  db,
  ownerId,
  otherId,
  reviewerId,
  config,
  check,
}) {
  const filters = {
    subjectId: "cbse-8-mathematics",
    language: "English",
    query: "",
    weekday: 3,
    startsAt: "10:00",
    endsAt: "11:00",
    preferenceOnly: false,
  };
  const directory = discoveryRepo(learner),
    one = tutorRepo(tutor),
    two = tutorRepo(otherTutor);
  check(
    !(await directory.search(filters)).candidates.length,
    "empty matching preview never substitutes fictional tutors",
  );
  for (const id of [ownerId, otherId]) {
    assert.ifError(
      (
        await server
          .from("tutor_profiles")
          .update({ teaching_skill_score: 75 })
          .eq("user_id", id)
      ).error,
    );
    assert.ifError(
      (
        await server
          .from("tutor_subject_qualifications")
          .upsert({ tutor_id: id, subject_id: filters.subjectId })
      ).error,
    );
    assert.ifError(
      (
        await server
          .from("tutor_languages")
          .upsert({ tutor_id: id, language: "English" })
      ).error,
    );
    assert.ifError(
      (
        await server
          .from("tutor_verification_records")
          .insert({
            tutor_id: id,
            status: "approved",
            reviewed_by: reviewerId,
            verified_grade: 10,
            decision_note:
              "DISPOSABLE LOCAL ADULT MATCHING TEST: no physical verification.",
          })
      ).error,
    );
  }
  check(
    !(await directory.search(filters)).candidates.length,
    "trusted test approval alone does not opt a tutor into disclosure",
  );
  for (const repo of [one, two]) {
    const state = await repo.load();
    await repo.setDiscoveryPreview(true, state.profile.revision);
  }
  await one.saveAvailability({
    id: randomUUID(),
    revision: null,
    weekday: 3,
    starts_at: "10:00",
    ends_at: "11:00",
    enabled: true,
  });
  const state = await directory.search(filters),
    first = (await one.load()).profile,
    second = (await two.load()).profile;
  check(
    state.test_only &&
      state.candidates.length === 2 &&
      state.candidates[0].preview_id === first.discovery_preview_id &&
      state.candidates[0].cms === 95 &&
      state.candidates[1].cms === 80,
    "real database qualifications and weekly preferences drive CMS order",
  );
  check(
    state.candidates[0].eligible &&
      state.candidates[0].reasons.length === 7 &&
      state.candidates[0].factors.availability === 1,
    "server returns structured eligibility and score explanations",
  );
  const keys = [
    "preview_id",
    "label",
    "eligible",
    "verified_grade",
    "teaching_skill_score",
    "cms",
    "factors",
    "reasons",
    "has_weekly_preference",
    "preference_matches",
  ].sort();
  check(
    state.candidates.every(
      (c) => JSON.stringify(Object.keys(c).sort()) === JSON.stringify(keys),
    ),
    "discovery exposes only the explicit ten-field candidate projection",
  );
  const serialized = JSON.stringify(state);
  check(
    !serialized.includes(ownerId) &&
      !serialized.includes(otherId) &&
      !serialized.includes("example.invalid") &&
      !serialized.includes("Adult test biography") &&
      !serialized.includes("decision_note") &&
      !serialized.includes("starts_at"),
    "Auth UUIDs, emails, biography, private schedules and review evidence remain private",
  );
  check(
    !(await learner.from("tutor_profiles").select("*")).data?.length &&
      !(await learner.from("tutor_availability").select("*")).data?.length &&
      !(await learner.from("tutor_verification_records").select("*")).data
        ?.length,
    "discovery does not weaken direct private-table RLS",
  );
  check(
    (await directory.search({ ...filters, preferenceOnly: true })).candidates
      .length === 1,
    "preference-only filter requires full saved-window compatibility",
  );
  check(
    !(
      await directory.search({
        ...filters,
        startsAt: "11:00",
        endsAt: "12:00",
        preferenceOnly: true,
      })
    ).candidates.length,
    "adjacent requested window does not count as availability overlap",
  );
  check(
    !(await directory.search({ ...filters, subjectId: "cbse-6-mathematics" }))
      .candidates.length,
    "grade-specific subject qualification required over actual API",
  );
  check(
    !(await directory.search({ ...filters, subjectId: "cbse-7-science" }))
      .candidates.length,
    "different subject qualification cannot pass matching",
  );
  check(
    !(await directory.search({ ...filters, language: "हिन्दी" })).candidates
      .length,
    "language qualification cannot fall back silently",
  );
  check(
    (
      await directory.search({
        ...filters,
        query: first.discovery_preview_id.slice(0, 8),
      })
    ).candidates.length === 1,
    "search matches authorized test pseudonym prefix",
  );
  check(
    !(await directory.search({ ...filters, query: "@example.invalid" }))
      .candidates.length,
    "private email/name data is not searchable",
  );
  await two.saveAvailability({
    id: randomUUID(),
    revision: null,
    weekday: 3,
    starts_at: "10:00",
    ends_at: "11:00",
    enabled: true,
  });
  check(
    (await directory.search(filters)).candidates
      .map((c) => c.preview_id)
      .join() ===
      [first.discovery_preview_id, second.discovery_preview_id].sort().join(),
    "equal unrounded CMS ranks deterministically by opaque preview ID",
  );
  assert.ifError(
    (
      await server
        .from("tutor_profiles")
        .update({ teaching_skill_score: 49.99 })
        .eq("user_id", ownerId)
    ).error,
  );
  check(
    !(await directory.search(filters)).candidates.some(
      (c) => c.preview_id === first.discovery_preview_id,
    ),
    "TSS under 50 excluded on a fresh real query",
  );
  assert.ifError(
    (
      await server
        .from("tutor_profiles")
        .update({ teaching_skill_score: 50 })
        .eq("user_id", ownerId)
    ).error,
  );
  check(
    (await directory.search(filters)).candidates.find(
      (c) => c.preview_id === first.discovery_preview_id,
    )?.cms === 90,
    "TSS exactly 50 remains eligible",
  );
  for (const status of ["pending", "rejected", "revoked"]) {
    assert.ifError(
      (
        await server
          .from("tutor_verification_records")
          .insert({
            tutor_id: ownerId,
            status,
            reviewed_by: reviewerId,
            decision_note: `DISPOSABLE LOCAL TEST: ${status} overrides approval`,
          })
      ).error,
    );
    check(
      !(await directory.search(filters)).candidates.some(
        (c) => c.preview_id === first.discovery_preview_id,
      ),
      `latest ${status} record excludes earlier approved tutor`,
    );
  }
  // An uncommitted trusted change cannot produce a mixed trust/score result.
  await db.query("begin");
  try {
    await db.query(
      "insert into public.tutor_verification_records(tutor_id,status,reviewed_by,verified_grade,decision_note) values($1,'approved',$2,10,'DISPOSABLE LOCAL TEST concurrent evidence')",
      [ownerId, reviewerId],
    );
    await db.query(
      "update public.tutor_profiles set teaching_skill_score=75 where user_id=$1",
      [ownerId],
    );
    check(
      !(await directory.search(filters)).candidates.some(
        (c) => c.preview_id === first.discovery_preview_id,
      ),
      "real API cannot observe an uncommitted partial eligibility change",
    );
    await db.query("commit");
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
  check(
    (await directory.search(filters)).candidates.some(
      (c) => c.preview_id === first.discovery_preview_id && c.cms === 95,
    ),
    "committed trusted change appears atomically on next API query",
  );
  assert.ifError(
    (
      await server
        .from("tutor_profiles")
        .update({ academic_grade: 7 })
        .eq("user_id", ownerId)
    ).error,
  );
  check(
    !(await directory.search(filters)).candidates.some(
      (c) => c.preview_id === first.discovery_preview_id,
    ),
    "effective grade is capped by current server-assigned academic record",
  );
  for (const [role, client] of [
    ["tutor", tutor],
    ["guardian", guardian],
    ["champion", champion],
    ["admin", admin],
    ["anonymous", anonymous],
  ]) {
    await assert.rejects(() => discoveryRepo(client).search(filters));
    check(true, `${role} cannot read adult learner discovery`);
  }
  check(
    !!(
      await learner.rpc("set_tutor_discovery_preview", {
        p_enabled: true,
        p_revision: 1,
      })
    ).error,
    "learner cannot enable another tutor preview",
  );
  check(
    !!(
      await tutor
        .from("tutor_profiles")
        .update({ discovery_preview_enabled: true })
        .eq("user_id", ownerId)
    ).error,
    "direct opt-in bypass remains denied",
  );
  check(
    !!(
      await learner.rpc("discover_test_tutors", {
        p_subject_id: filters.subjectId,
        p_language: "English",
        p_learner_id: otherId,
      })
    ).error,
    "caller cannot override discovery identity",
  );
  const opt = (await two.load()).profile;
  await two.setDiscoveryPreview(false, opt.revision);
  check(
    !(await directory.search(filters)).candidates.length,
    "opt-out is persisted and removes a qualified tutor",
  );
  await assert.rejects(() =>
    directory.search({ ...filters, query: "x".repeat(65) }),
  );
  await assert.rejects(() =>
    directory.search({ ...filters, startsAt: "12:00", endsAt: "11:00" }),
  );
  check(true, "malformed and oversized filters rejected by trusted boundary");
  const token = (await otherLearner.auth.getSession()).data.session
    .access_token;
  await otherLearner.auth.signOut({ scope: "global" });
  const replay = await fetch(`${config.url}/rest/v1/rpc/discover_test_tutors`, {
    method: "POST",
    headers: {
      apikey: config.publicKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_subject_id: filters.subjectId,
      p_language: "English",
    }),
  });
  check(!replay.ok, "revoked learner JWT cannot replay discovery RPC");
}
