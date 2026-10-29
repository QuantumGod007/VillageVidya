import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import {
  prepareClassroom,
  cleanupClassroom,
  classroomRepositories,
} from "./classroom.mjs";
import { transientClient } from "./local.mjs";
import { cleanupTestBookings } from "./booking-cleanup.mjs";
export async function testBookingApi(config, check) {
  const db = new pg.Client({ connectionString: config.databaseUrl });
  await db.connect();
  const batches = [];
  const factories = await classroomRepositories();
  async function setup() {
    const manifest = await prepareClassroom(config, { acknowledged: true });
    batches.push(manifest);
    const clients = {},
      books = {};
    for (const role of ["learner", "tutor", "champion", "guardian"]) {
      const c = transientClient(config.url, config.publicKey),
        account = manifest.accounts[role];
      assert.ifError(
        (
          await c.auth.signInWithPassword({
            email: account.email,
            password: account.password,
          })
        ).error,
      );
      clients[role] = c;
      books[role] = factories.supabaseBookingRepository(c).forActor(account.id);
    }
    const trust = factories.supabaseTrustRepository(clients.champion);
    const review = (await trust.load()).tutor_reviews.find(
      (r) => r.tutor_id === manifest.accounts.tutor.id,
    );
    await trust.reviewTutor({
      tutorId: review.tutor_id,
      token: review.token,
      status: "approved",
      grade: 10,
      reason: "Synthetic adult request integration approval only.",
      requestId: randomUUID(),
    });
    const tutor = factories.supabaseTutorRepository(clients.tutor);
    await tutor.setDiscoveryPreview(
      true,
      (await tutor.load()).profile.revision,
    );
    for (let weekday = 0; weekday < 7; weekday++)
      await tutor.saveAvailability({
        id: randomUUID(),
        revision: null,
        weekday,
        starts_at: "16:00",
        ends_at: "18:00",
        enabled: true,
      });
    await factories
      .supabaseLearnerRepository(clients.learner)
      .enroll("cbse-8-mathematics", "English");
    const preview = (await tutor.load()).profile.discovery_preview_id;
    const result = { manifest, clients, books, trust, preview };
    return result;
  }
  try {
    const a = await setup(),
      b = await setup();
    const start = (
      await db.query(
        "select (date_trunc('day',clock_timestamp() at time zone 'Asia/Kolkata')+interval '1 day 16 hours') at time zone 'Asia/Kolkata' v",
      )
    ).rows[0].v;
    const slot = (minutes) => new Date(+start + minutes * 60_000).toISOString();
    const input = (target, minutes, topic = "Synthetic original practice") => ({
      previewId: target.preview,
      subjectId: "cbse-8-mathematics",
      language: "English",
      startsAt: slot(minutes),
      durationMinutes: 15,
      topic,
      intentId: randomUUID(),
    });
    const response = (id, action = "accept", revision = 1) => ({
      requestId: id,
      revision,
      action,
      intentId: randomUUID(),
    });
    const action = (
      id,
      revision,
      value,
      note = "Synthetic adult session activity.",
    ) => ({
      sessionId: id,
      revision,
      action: value,
      note,
      intentId: randomUUID(),
    });
    const creation = input(a, 0);
    const duplicates = await Promise.all([
      a.books.learner.request(creation),
      a.books.learner.request(creation),
    ]);
    const requestId = duplicates[0];
    await assert.rejects(() => a.books.learner.respond(response(requestId)));
    check(
      true,
      "real learner cannot impersonate the tutor's acceptance action",
    );
    check(
      new Set(duplicates).size === 1,
      "real request duplicate delivery shares one server ID",
    );
    check(
      (await a.books.tutor.load()).requests.some((r) => r.id === requestId),
      "separate authenticated tutor receives the same request",
    );
    const acceptedInput = response(requestId),
      accepted = await Promise.all([
        a.books.tutor.respond(acceptedInput),
        a.books.tutor.respond(acceptedInput),
      ]);
    const sessionId = accepted[0];
    check(
      new Set(accepted).size === 1 &&
        (
          await db.query(
            "select count(*)::int n from public.test_scheduled_sessions where request_id=$1",
            [requestId],
          )
        ).rows[0].n === 1,
      "real duplicate acceptance creates exactly one PostgreSQL reservation",
    );
    check(
      (await a.books.learner.load()).requests.find((r) => r.id === requestId)
        .status === "accepted",
      "learner sees independent tutor acceptance",
    );
    await a.clients.learner.auth.signOut();
    a.clients.learner = transientClient(config.url, config.publicKey);
    assert.ifError(
      (
        await a.clients.learner.auth.signInWithPassword({
          email: a.manifest.accounts.learner.email,
          password: a.manifest.accounts.learner.password,
        })
      ).error,
    );
    a.books.learner = factories
      .supabaseBookingRepository(a.clients.learner)
      .forActor(a.manifest.accounts.learner.id);
    check(
      (await a.books.learner.load(sessionId)).sessions[0].status ===
        "scheduled",
      "confirmed session persists across actual sign-out and fresh sign-in",
    );
    const declined = await a.books.learner.request(input(a, 15));
    await a.books.tutor.respond(response(declined, "decline"));
    check(
      (await a.books.learner.load(declined)).requests[0].status === "declined",
      "real tutor decline reaches learner account",
    );
    const fallback = await a.books.learner.request({
      previousRequestId: declined,
      intentId: randomUUID(),
    });
    check(
      (await b.books.tutor.load()).requests.some((r) => r.id === fallback),
      "manual fallback reaches a different currently eligible tutor",
    );
    check(
      (
        await db.query(
          "select count(distinct search_id)::int n from public.test_tutor_requests where id=any($1::uuid[])",
          [[declined, fallback]],
        )
      ).rows[0].n === 1,
      "manual fallback retains the original server matching window",
    );
    await assert.rejects(() =>
      a.books.learner.request({
        previousRequestId: declined,
        intentId: randomUUID(),
      }),
    );
    await a.books.learner.respond(response(fallback, "cancel"));
    check(true, "fallback cannot fork or reuse an already advanced invitation");
    const expired = await a.books.learner.request(input(a, 30));
    await db.query(
      "update public.test_tutor_requests set expires_at=clock_timestamp()-interval '1 second' where id=$1",
      [expired],
    );
    check(
      (await a.books.tutor.load(expired)).requests[0].status === "expired",
      "effective expiry uses server time on API reads",
    );
    await assert.rejects(() =>
      a.books.tutor.respond(response(expired, "accept", 2)),
    );
    await db.query(
      "update public.test_tutor_requests set search_started_at=clock_timestamp()-interval '91 seconds',expires_at=clock_timestamp()-interval '5 seconds' where id=$1",
      [expired],
    );
    await assert.rejects(() =>
      a.books.learner.request({
        previousRequestId: expired,
        intentId: randomUUID(),
      }),
    );
    check(
      true,
      "expired invitation and elapsed 90-second matching window cannot be revived",
    );
    const cancelled = await a.books.learner.request(input(a, 45));
    await a.books.learner.respond(response(cancelled, "cancel"));
    await assert.rejects(() =>
      a.books.tutor.respond(response(cancelled, "accept", 2)),
    );
    check(true, "cancelled invitation cannot be accepted");
    const raceRequests = await Promise.all([
      a.books.learner.request(input(a, 60)),
      b.books.learner.request(input(a, 60)),
    ]);
    const race = await Promise.all(
      raceRequests.map((id) =>
        a.clients.tutor.rpc("respond_test_request", {
          p_request_id: id,
          p_revision: 1,
          p_action: "accept",
          p_intent_id: randomUUID(),
        }),
      ),
    );
    check(
      race.filter((r) => !r.error).length === 1 &&
        race.find((r) => r.error).error.code === "23P01",
      "separate real learners cannot double-book the same tutor",
    );
    const learnerRequests = await Promise.all([
      a.books.learner.request(input(a, 75)),
      a.books.learner.request(input(b, 75)),
    ]);
    const learnerRace = await Promise.all([
      a.clients.tutor.rpc("respond_test_request", {
        p_request_id: learnerRequests[0],
        p_revision: 1,
        p_action: "accept",
        p_intent_id: randomUUID(),
      }),
      b.clients.tutor.rpc("respond_test_request", {
        p_request_id: learnerRequests[1],
        p_revision: 1,
        p_action: "accept",
        p_intent_id: randomUUID(),
      }),
    ]);
    check(
      learnerRace.filter((r) => !r.error).length === 1 &&
        learnerRace.find((r) => r.error).error.code === "23P01",
      "one learner cannot reserve overlapping sessions with different tutors",
    );
    const revoked = await a.books.learner.request(input(a, 90));
    let row = (await a.trust.load()).tutor_reviews.find(
      (r) => r.tutor_id === a.manifest.accounts.tutor.id,
    );
    await a.trust.reviewTutor({
      tutorId: row.tutor_id,
      token: row.token,
      status: "revoked",
      grade: null,
      reason: "Synthetic tutor approval revoked before acceptance.",
      requestId: randomUUID(),
    });
    await assert.rejects(() => a.books.learner.request(input(a, 105)));
    await assert.rejects(() => a.books.tutor.respond(response(revoked)));
    check(
      true,
      "revoked or no-longer-approved tutor cannot receive or accept test requests",
    );
    await db.query(
      "insert into public.tutor_verification_records(tutor_id,status,reviewed_by,decision_note) values($1,'pending',$2,'ADULT TEST ONLY: pending approval boundary fixture.')",
      [a.manifest.accounts.tutor.id, a.manifest.accounts.champion.id],
    );
    await assert.rejects(() => a.books.tutor.respond(response(revoked)));
    check(
      true,
      "latest pending approval also denies acceptance through real Auth/API",
    );
    const disabled = await a.books.learner.request(input(b, 105));
    await db.query(
      "update public.adult_test_accounts set enabled=false where user_id=$1",
      [a.manifest.accounts.learner.id],
    );
    try {
      await assert.rejects(() => a.books.learner.request(input(b, 90)));
      await assert.rejects(() => b.books.tutor.respond(response(disabled)));
      await assert.rejects(() => a.books.learner.request(creation));
      check(
        true,
        "disabled learner blocks new requests, acceptance and successful-intent replay",
      );
    } finally {
      await db.query(
        "update public.adult_test_accounts set enabled=true where user_id=$1",
        [a.manifest.accounts.learner.id],
      );
    }
    await db.query(
      "update auth.users set banned_until=clock_timestamp()+interval '1 hour' where id=$1",
      [b.manifest.accounts.tutor.id],
    );
    try {
      await assert.rejects(() => a.books.learner.request(input(b, 90)));
      await assert.rejects(() => b.books.tutor.respond(response(disabled)));
      check(
        true,
        "banned tutor identity blocks new requests and acceptance despite existing JWTs",
      );
    } finally {
      await db.query("update auth.users set banned_until=null where id=$1", [
        b.manifest.accounts.tutor.id,
      ]);
      assert.ifError(
        (
          await b.clients.tutor.auth.signInWithPassword({
            email: b.manifest.accounts.tutor.email,
            password: b.manifest.accounts.tutor.password,
          })
        ).error,
      );
    }
    await assert.rejects(() => b.books.learner.load(sessionId));
    await assert.rejects(() =>
      b.books.tutor.transition(action(sessionId, 1, "cancel")),
    );
    await assert.rejects(() => a.books.guardian.load());
    check(
      true,
      "unrelated learner/tutor and guardian cannot read or mutate private bookings",
    );
    check(
      !!(
        await a.clients.learner
          .from("test_scheduled_sessions")
          .update({ learner_id: b.manifest.accounts.learner.id })
          .eq("id", sessionId)
      ).error &&
        !!(await a.clients.learner.from("test_booking_events").select("*"))
          .error,
      "direct ownership edits and raw private history access remain denied",
    );
    check(
      !!(
        await a.clients.learner.rpc("request_test_tutor", {
          p_intent_id: randomUUID(),
          p_learner_id: b.manifest.accounts.learner.id,
        })
      ).error,
      "API rejects a forged learner ownership parameter",
    );
    await assert.rejects(() =>
      a.books.learner.transition(action(sessionId, 1, "complete")),
    );
    await assert.rejects(() =>
      a.books.tutor.transition(action(sessionId, 1, "start")),
    );
    check(true, "invalid completion and early session start are denied");
    row = (await a.trust.load()).tutor_reviews.find(
      (r) => r.tutor_id === a.manifest.accounts.tutor.id,
    );
    await a.trust.reviewTutor({
      tutorId: row.tutor_id,
      token: row.token,
      status: "approved",
      grade: 10,
      reason: "Fresh synthetic approval for lifecycle verification.",
      requestId: randomUUID(),
    });
    await db.query(
      "update public.test_scheduled_sessions set starts_at=date_trunc('minute',clock_timestamp())-interval '1 minute',ends_at=date_trunc('minute',clock_timestamp())+interval '14 minutes' where id=$1",
      [sessionId],
    );
    await a.books.learner.transition(action(sessionId, 2, "start"));
    check(
      (await a.books.tutor.load(sessionId)).sessions[0].status === "active",
      "real participant starts the shared persistent activity record in its time window",
    );
    const finishing = await Promise.allSettled([
      a.books.learner.transition(action(sessionId, 3, "complete")),
      a.books.tutor.transition(action(sessionId, 3, "cancel")),
    ]);
    check(
      finishing.filter((r) => r.status === "fulfilled").length === 1,
      "concurrent completion/cancellation cannot corrupt lifecycle revision",
    );
    const completingRequest = await a.books.learner.request(input(b, 90));
    const completingSession = await b.books.tutor.respond(
      response(completingRequest),
    );
    await db.query(
      "update public.test_scheduled_sessions set starts_at=date_trunc('minute',clock_timestamp())-interval '1 minute',ends_at=date_trunc('minute',clock_timestamp())+interval '14 minutes' where id=$1",
      [completingSession],
    );
    await a.books.learner.transition(action(completingSession, 2, "start"));
    await b.books.tutor.transition(
      action(
        completingSession,
        3,
        "complete",
        "Synthetic text-only practice completed.",
      ),
    );
    const completed = (await a.books.learner.load(completingSession))
      .sessions[0];
    check(
      completed.status === "completed" &&
        completed.summary === "Synthetic text-only practice completed." &&
        completed.history.at(-1).actor_role === "tutor",
      "real start/completion persists shared summary and server actor identity",
    );
    const learnerSession = learnerRace.find((r) => !r.error).data;
    await a.books.learner.transition(action(learnerSession, 1, "cancel"));
    check(
      (await a.books.learner.load(learnerSession)).sessions[0].status ===
        "cancelled",
      "participant cancellation persists in PostgreSQL",
    );
    const missed = race.find((r) => !r.error).data;
    await db.query(
      "update public.test_scheduled_sessions set starts_at=date_trunc('minute',clock_timestamp())-interval '16 minutes',ends_at=date_trunc('minute',clock_timestamp())-interval '1 minute' where id=$1",
      [missed],
    );
    check(
      (await a.books.tutor.load(missed)).sessions[0].status === "missed",
      "unstarted past session is effectively missed on server read",
    );
    await assert.rejects(() =>
      a.books.tutor.transition(action(missed, 2, "start")),
    );
    check(true, "missed session cannot be started from a stale screen");
    const oldToken = (await b.clients.learner.auth.getSession()).data.session
      .access_token;
    await b.clients.learner.auth.signOut();
    check(
      !!(
        await transientClient(config.url, config.publicKey)
          .rpc("load_test_bookings", {})
          .setHeader("Authorization", `Bearer ${oldToken}`)
      ).error,
      "revoked real session JWT cannot read bookings",
    );
    assert.ifError(
      (
        await b.clients.learner.auth.signInWithPassword({
          email: a.manifest.accounts.learner.email,
          password: a.manifest.accounts.learner.password,
        })
      ).error,
    );
    await assert.rejects(() => b.books.learner.request(input(b, 90)));
    check(
      true,
      "an actor-bound repository refuses another real account's token after switching",
    );
    const projection = JSON.stringify(await a.books.learner.load());
    check(
      !/Aditi|Aarav|demo-session|example.invalid/.test(projection),
      "browser demo identities/history never become real account records",
    );
  } finally {
    if (batches.length) {
      const ids = batches.flatMap((m) =>
        Object.values(m.accounts).map((a) => a.id),
      );
      await db.query("begin");
      await cleanupTestBookings(db, ids);
      await db.query("commit");
      for (const m of batches) await cleanupClassroom(config, m);
    }
    await db.end();
  }
}
