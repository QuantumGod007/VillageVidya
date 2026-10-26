import pg from "pg";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { cleanupTestBookings } from "../auth/booking-cleanup.mjs";
export async function testBookingConcurrency(connectionString) {
  const db = new pg.Client({ connectionString });
  await db.connect();
  const ids = Object.fromEntries(
    ["champion", "learner", "other", "tutor", "secondTutor"].map((r) => [
      r,
      randomUUID(),
    ]),
  );
  const all = Object.values(ids),
    previews = {};
  async function run(actor, sql, args = []) {
    const c = new pg.Client({
      connectionString,
      application_name: `vv-booking-${actor}`,
    });
    await c.connect();
    try {
      await c.query("begin");
      await c.query("set local role authenticated");
      await c.query("select set_config('request.jwt.claims',$1,true)", [
        JSON.stringify({ sub: ids[actor], session_id: ids[actor] }),
      ]);
      const r = await c.query(sql, args);
      await c.query("commit");
      return r.rows[0]?.v;
    } finally {
      await c.end();
    }
  }
  let start, pendingAcceptance;
  const request = (actor, tutor, begins = start, intent = randomUUID()) =>
    run(
      actor,
      "select public.request_test_tutor($1,$2,'cbse-8-mathematics','English',$3,15::smallint,'Synthetic concurrent request') v",
      [intent, previews[tutor], begins],
    );
  const respond = (
    actor,
    id,
    action = "accept",
    intent = randomUUID(),
    revision = 1,
  ) =>
    run(actor, "select public.respond_test_request($1,$2,$3,$4) v", [
      id,
      revision,
      action,
      intent,
    ]);
  const transition = (actor, id, rev, action) =>
    run(
      actor,
      "select public.transition_test_session($1,$2,$3,'Synthetic lifecycle concurrency.', $4) v",
      [id, rev, action, randomUUID()],
    );
  const oneWinner = (results, code) => {
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      results.find((r) => r.status === "rejected").reason.code,
      code,
    );
  };
  try {
    for (const [name, id] of Object.entries(ids)) {
      const role =
        name === "other" ? "learner" : name === "secondTutor" ? "tutor" : name;
      await db.query(
        "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
        [id, `vv-booking-${id}@example.invalid`],
      );
      await db.query(
        "insert into public.profiles(id,display_name) values($1,'Disposable adult booking fixture')",
        [id],
      );
      await db.query(
        "insert into public.user_roles(user_id,role) values($1,$2)",
        [id, role],
      );
      await db.query(
        "insert into public.adult_test_accounts(user_id,enabled) values($1,true)",
        [id],
      );
      await db.query("insert into auth.sessions(id,user_id) values($1,$1)", [
        id,
      ]);
      if (role === "learner")
        await db.query(
          "insert into public.learner_profiles(user_id) values($1)",
          [id],
        );
      if (role === "tutor") {
        previews[name] = (
          await db.query(
            "insert into public.tutor_profiles(user_id,academic_grade,teaching_skill_score,discovery_preview_enabled) values($1,12,75,true) returning discovery_preview_id",
            [id],
          )
        ).rows[0].discovery_preview_id;
        await db.query(
          "insert into public.tutor_subject_qualifications(tutor_id,subject_id) values($1,'cbse-8-mathematics')",
          [id],
        );
        await db.query(
          "insert into public.tutor_languages(tutor_id,language) values($1,'English')",
          [id],
        );
        await db.query(
          "insert into public.tutor_availability(tutor_id,weekday,starts_at,ends_at,enabled) select $1,n,'16:00','17:00',true from generate_series(0,6) n",
          [id],
        );
        await db.query(
          "insert into public.tutor_verification_records(tutor_id,status,reviewed_by,verified_grade,decision_note) values($1,'approved',$2,12,'ADULT TEST ONLY: concurrency fixture.')",
          [id, ids.champion],
        );
      }
    }
    start = (
      await db.query(
        "select (date_trunc('day',clock_timestamp() at time zone 'Asia/Kolkata')+interval '1 day 16 hours') at time zone 'Asia/Kolkata' v",
      )
    ).rows[0].v;
    const intent = randomUUID();
    const duplicate = await Promise.all(
      Array.from({ length: 6 }, () =>
        request("learner", "tutor", start, intent),
      ),
    );
    assert.equal(new Set(duplicate).size, 1);
    const acceptIntent = randomUUID();
    const accepted = await Promise.all(
      Array.from({ length: 6 }, () =>
        respond("tutor", duplicate[0], "accept", acceptIntent),
      ),
    );
    assert.equal(new Set(accepted).size, 1);
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from public.test_scheduled_sessions where request_id=$1",
          [duplicate[0]],
        )
      ).rows[0].n,
      1,
    );
    const secondSlot = new Date(+start + 15 * 60_000);
    const pair = await Promise.all([
      request("learner", "tutor", secondSlot),
      request("other", "tutor", secondSlot),
    ]);
    oneWinner(
      await Promise.allSettled(pair.map((id) => respond("tutor", id))),
      "23P01",
    );
    const thirdSlot = new Date(+start + 30 * 60_000);
    const learnerPair = await Promise.all([
      request("learner", "tutor", thirdSlot),
      request("learner", "secondTutor", thirdSlot),
    ]);
    oneWinner(
      await Promise.allSettled([
        respond("tutor", learnerPair[0]),
        respond("secondTutor", learnerPair[1]),
      ]),
      "23P01",
    );
    const lastSlot = new Date(+start + 45 * 60_000);
    const cancellable = await request("other", "secondTutor", lastSlot);
    oneWinner(
      await Promise.allSettled([
        respond("secondTutor", cancellable),
        respond("other", cancellable, "cancel"),
      ]),
      "40001",
    );
    // A committed trust revocation while acceptance waits on the shared profile
    // lock must be seen by the later eligibility check.
    const nextDay = new Date(+start + 86_400_000);
    const revoking = await request("other", "tutor", nextDay);
    await db.query("begin");
    await db.query(
      "select 1 from public.tutor_profiles where user_id=$1 for update",
      [ids.tutor],
    );
    const blocked = respond("tutor", revoking).then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    pendingAcceptance = blocked;
    const lockDeadline = Date.now() + 3_000;
    while (
      !(
        await db.query(
          "select exists(select 1 from pg_stat_activity where application_name='vv-booking-tutor' and wait_event_type='Lock') v",
        )
      ).rows[0].v
    ) {
      assert.ok(
        Date.now() < lockDeadline,
        "acceptance must actually wait on the tutor profile lock",
      );
      await new Promise((done) => setTimeout(done, 10));
      await db.query("select pg_stat_clear_snapshot()");
    }
    await db.query(
      "insert into public.tutor_verification_records(tutor_id,status,reviewed_by,decision_note) values($1,'revoked',$2,'ADULT TEST: revoke during acceptance contention.')",
      [ids.tutor, ids.champion],
    );
    await db.query("commit");
    assert.equal((await blocked).error.code, "42501");
    // Lifecycle contention uses only owner-controlled boundary-time fixtures;
    // no client can edit a reservation's timestamps.
    const lifecycleRequest = await request("learner", "secondTutor", nextDay);
    const session = await respond("secondTutor", lifecycleRequest);
    await db.query(
      "update public.test_scheduled_sessions set starts_at=date_trunc('minute',clock_timestamp())-interval '1 minute',ends_at=date_trunc('minute',clock_timestamp())+interval '14 minutes' where id=$1",
      [session],
    );
    await transition("learner", session, 2, "start");
    oneWinner(
      await Promise.allSettled([
        transition("learner", session, 3, "complete"),
        transition("secondTutor", session, 3, "cancel"),
      ]),
      "40001",
    );
    // The SQL exclusion constraint also rejects overlapping trusted inserts,
    // independently of the participant locks used by the application RPC.
    await assert.rejects(
      db.query(
        "insert into public.test_scheduled_sessions(request_id,learner_id,tutor_id,subject_id,language,starts_at,ends_at) select $1,$2,$3,'cbse-8-mathematics','English',$4::timestamptz,$4::timestamptz+interval '15 minutes'",
        [revoking, ids.other, ids.tutor, start],
      ),
      { code: "23P01" },
    );
    console.log(
      "PASS booking concurrency: duplicate request/acceptance, competing learners, learner overlap, accept/cancel, revocation, complete/cancel and SQL exclusion constraints",
    );
  } finally {
    await db.query("rollback");
    if (pendingAcceptance) await pendingAcceptance;
    await db.query("begin");
    await cleanupTestBookings(db, all);
    await db.query(
      "delete from public.tutor_verification_records where tutor_id=any($1::uuid[])",
      [all],
    );
    await db.query("delete from auth.users where id=any($1::uuid[])", [all]);
    await db.query("commit");
    await db.end();
  }
}
