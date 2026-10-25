import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export async function testTutorApi({
  repo,
  tutor,
  learner,
  anonymous,
  other,
  server,
  loginAgain,
  restore,
  tutorSession,
  ownerId,
  otherId,
  reviewerId,
  check,
  config,
}) {
  const records = repo(tutor);
  let state = await records.load();
  check(
    state.profile.teaching_skill_score === null &&
      state.profile.completed_sessions === 0 &&
      !state.verification.length &&
      !state.availability.length &&
      !state.subjects.length &&
      !state.languages.length,
    "provisioned tutor starts with genuine empty trust and schedule records",
  );
  await records.saveBio("Adult test biography", state.profile.revision);
  state = await records.load();
  check(
    state.profile.bio === "Adult test biography",
    "biography persists through typed repository and real API",
  );
  await assert.rejects(() => records.saveBio("stale biography", 1));
  check(
    (await records.load()).profile.bio === "Adult test biography",
    "stale profile save cannot overwrite current content",
  );
  await assert.rejects(() =>
    records.saveBio("a".repeat(1201), state.profile.revision),
  );
  check(
    !!(
      await tutor.rpc("save_tutor_bio", {
        p_bio: "forged",
        p_revision: state.profile.revision,
        p_academic_grade: 12,
      })
    ).error,
    "unknown trusted RPC fields rejected",
  );
  for (const field of [
    "academic_grade",
    "teaching_skill_score",
    "completed_sessions",
    "revision",
  ]) {
    check(
      !!(
        await tutor
          .from("tutor_profiles")
          .update({ [field]: 100 })
          .eq("user_id", ownerId)
      ).error,
      `${field} cannot be self-awarded over API`,
    );
  }
  const input = {
    id: randomUUID(),
    revision: null,
    weekday: 1,
    starts_at: "16:00",
    ends_at: "17:00",
    enabled: true,
  };
  await Promise.all(
    Array.from({ length: 4 }, () => records.saveAvailability(input)),
  );
  state = await records.load();
  check(
    state.availability.length === 1,
    "concurrent duplicate availability delivery retains one record",
  );
  const overlap = await Promise.allSettled([
    records.saveAvailability({
      ...input,
      id: randomUUID(),
      starts_at: "18:00",
      ends_at: "19:00",
    }),
    records.saveAvailability({
      ...input,
      id: randomUUID(),
      starts_at: "18:30",
      ends_at: "19:30",
    }),
  ]);
  check(
    overlap.filter((r) => r.status === "fulfilled").length === 1,
    "real API concurrent overlapping inserts allow exactly one winner",
  );
  await assert.rejects(() =>
    records.saveAvailability({
      ...input,
      id: randomUUID(),
      starts_at: "16:15",
      ends_at: "16:45",
      enabled: false,
    }),
  );
  check(
    (await records.load()).availability.length === 2,
    "disabled overlaps rejected at the database boundary",
  );
  await records.saveAvailability({
    ...input,
    id: randomUUID(),
    starts_at: "17:00",
    ends_at: "18:00",
  });
  const saved = (await records.load()).availability.find(
    (r) => r.id === input.id,
  );
  const edit = await Promise.allSettled([
    records.saveAvailability({ ...saved, enabled: false }),
    records.saveAvailability({ ...saved, weekday: 2 }),
  ]);
  check(
    edit.filter((r) => r.status === "fulfilled").length === 1,
    "real API same-revision concurrent edits reject one stale request",
  );
  const current = (await records.load()).availability.find(
    (r) => r.id === input.id,
  );
  await assert.rejects(() =>
    records.deleteAvailability(current.id, saved.revision),
  );
  await records.saveAvailability({ ...current, weekday: 2, enabled: false });
  const changed = (await records.load()).availability.find(
    (r) => r.id === input.id,
  );
  check(
    changed.weekday === 2 && !changed.enabled,
    "edit and disable saved as weekly preferences",
  );
  await records.saveAvailability({ ...changed, enabled: true });
  const restoredClient = await restore(tutorSession);
  check(
    (await repo(restoredClient).load()).profile.bio ===
      "Adult test biography" &&
      (await repo(restoredClient).load()).availability.length === 3,
    "fresh client restores tutor biography and weekly schedule",
  );
  const nextClient = await loginAgain();
  check(
    (await repo(nextClient).load()).availability.some(
      (s) => s.id === input.id && s.enabled,
    ),
    "fresh tutor sign-in restores enabled preference",
  );
  const foreign = repo(other);
  check(
    !(await foreign.load()).availability.length &&
      !(await other.from("tutor_profiles").select("*").eq("user_id", ownerId))
        .data?.length,
    "another tutor cannot read private tutor records",
  );
  await assert.rejects(() =>
    foreign.saveAvailability({ ...changed, enabled: false }),
  );
  await foreign.deleteAvailability(input.id, changed.revision);
  check(
    (await records.load()).availability.length === 3,
    "another tutor cannot edit or delete owned availability",
  );
  check(
    !(await learner.from("tutor_availability").select("*")).data?.length,
    "learner cannot read tutor schedules",
  );
  await assert.rejects(() => repo(learner).saveBio("forged", 1));
  check(
    !!(
      await learner.rpc("save_tutor_availability", {
        p_id: randomUUID(),
        p_revision: null,
        p_weekday: 1,
        p_starts_at: "10:00",
        p_ends_at: "11:00",
        p_enabled: true,
      })
    ).error,
    "learner cannot call tutor schedule RPC",
  );
  check(
    !!(await anonymous.from("tutor_profiles").select("*")).error &&
      !!(
        await anonymous.rpc("delete_tutor_availability", {
          p_id: input.id,
          p_revision: 1,
        })
      ).error,
    "anonymous private tutor reads and RPCs denied",
  );
  check(
    !!(
      await tutor
        .from("tutor_subject_qualifications")
        .insert({ tutor_id: ownerId, subject_id: "cbse-8-mathematics" })
    ).error &&
      !!(
        await tutor
          .from("tutor_languages")
          .insert({ tutor_id: ownerId, language: "English" })
      ).error,
    "self qualification and language approval denied",
  );
  // Disposable local test evidence only. Never physical verification or booking permission.
  assert.ifError(
    (
      await server
        .from("tutor_subject_qualifications")
        .insert({ tutor_id: ownerId, subject_id: "cbse-8-mathematics" })
    ).error,
  );
  assert.ifError(
    (
      await server
        .from("tutor_languages")
        .insert({ tutor_id: ownerId, language: "English" })
    ).error,
  );
  for (const status of ["approved", "revoked"])
    assert.ifError(
      (
        await server
          .from("tutor_verification_records")
          .insert({
            tutor_id: ownerId,
            status,
            verified_grade: 12,
            reviewed_by: reviewerId,
            decision_note: `DISPOSABLE LOCAL TEST ONLY: ${status}; no physical verification.`,
          })
      ).error,
    );
  const trusted = await records.load();
  check(
    trusted.verification[0].status === "revoked" &&
      trusted.verification[0].event_number >
        trusted.verification[1].event_number &&
      trusted.subjects.length === 1 &&
      trusted.languages.length === 1,
    "real trusted test records read in authoritative event order; revocation wins",
  );
  check(
    !(
      await other
        .from("tutor_verification_records")
        .select("*")
        .eq("tutor_id", ownerId)
    ).data?.length,
    "verification history private across tutor accounts",
  );
  check(
    !!(
      await server
        .from("tutor_verification_records")
        .update({ status: "approved" })
        .eq("tutor_id", ownerId)
    ).error,
    "verification history immutable even to service API",
  );
  const latest = (await records.load()).availability.find(
    (s) => s.id === input.id,
  );
  await records.deleteAvailability(latest.id, latest.revision);
  await records.deleteAvailability(latest.id, latest.revision);
  check(
    !(await records.load()).availability.some((s) => s.id === input.id),
    "delete persists and repeated deletion is safe",
  );
  const otherSession = await other.auth.getSession();
  await other.auth.signOut({ scope: "global" });
  const headers = {
    apikey: config.publicKey,
    Authorization: `Bearer ${otherSession.data.session.access_token}`,
  };
  const replay = await fetch(`${config.url}/rest/v1/tutor_profiles?select=*`, {
    headers,
  });
  check(
    replay.ok && !(await replay.json()).length,
    "revoked tutor JWT loses private profile reads",
  );
  const denied = await fetch(`${config.url}/rest/v1/rpc/save_tutor_bio`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ p_bio: "revoked", p_revision: 1 }),
  });
  check(!denied.ok, "revoked tutor JWT cannot replay biography RPC");
  check(otherId !== ownerId, "distinct real tutor accounts exercised");
}
