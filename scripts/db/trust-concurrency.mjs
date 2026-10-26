import pg from "pg";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
// Independent authenticated database connections exercise committed contention,
// rather than simulating stale decisions within one rollback-only transaction.
export async function testTrustConcurrency(connectionString) {
  const db = new pg.Client({ connectionString });
  await db.connect();
  const ids = Object.fromEntries(
    ["tutor", "champion", "admin", "guardian", "learner"].map((r) => [
      r,
      randomUUID(),
    ]),
  );
  const all = Object.values(ids);
  async function run(actor, sql, values = []) {
    const c = new pg.Client({ connectionString });
    await c.connect();
    try {
      await c.query("begin");
      await c.query("set local role authenticated");
      await c.query("select set_config('request.jwt.claims',$1,true)", [
        JSON.stringify({ sub: ids[actor], session_id: ids[actor] }),
      ]);
      const r = await c.query(sql, values);
      await c.query("commit");
      return r.rows[0]?.v;
    } finally {
      await c.end();
    }
  }
  const workspace = (actor) =>
    run(actor, "select public.load_test_trust_workspace() v");
  const review = (actor, token, status, request = randomUUID()) =>
    run(
      actor,
      "select public.review_test_tutor($1,$2,$3,$4::smallint,$5,$6) v",
      [
        ids.tutor,
        token,
        status,
        status === "approved" ? 8 : null,
        "Synthetic concurrent classroom decision.",
        request,
      ],
    );
  try {
    for (const [role, id] of Object.entries(ids)) {
      await db.query(
        "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
        [id, `vv-trust-${id}@example.invalid`],
      );
      await db.query(
        "insert into public.profiles(id,display_name) values($1,'Disposable synthetic adult concurrency fixture')",
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
    }
    await db.query(
      "insert into public.tutor_profiles(user_id,academic_grade) values($1,12)",
      [ids.tutor],
    );
    await db.query("insert into public.learner_profiles(user_id) values($1)", [
      ids.learner,
    ]);
    await db.query(
      "insert into public.tutor_subject_qualifications(tutor_id,subject_id) values($1,'cbse-8-mathematics')",
      [ids.tutor],
    );
    await db.query(
      "insert into public.tutor_languages(tutor_id,language) values($1,'English')",
      [ids.tutor],
    );
    await db.query(
      "insert into public.tutor_test_evidence(tutor_id,prepared_by,note) values($1,$2,'Synthetic metadata, no real verification performed.')",
      [ids.tutor, ids.admin],
    );
    const token = (await workspace("champion")).tutor_reviews.find(
      (t) => t.tutor_id === ids.tutor,
    ).token;
    const request = randomUUID();
    const race = await Promise.allSettled([
      review("champion", token, "approved", request),
      review("admin", token, "rejected"),
    ]);
    assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      race.find((r) => r.status === "rejected").reason.code,
      "40001",
    );
    const winner = race[0].status === "fulfilled" ? "champion" : "admin";
    if (winner === "champion")
      assert.equal(
        await review("champion", token, "approved", request),
        race[0].value,
      );
    let row = (await workspace("champion")).tutor_reviews.find(
      (t) => t.tutor_id === ids.tutor,
    );
    if (row.status !== "approved")
      await review("champion", row.token, "approved");
    await db.query(
      "update public.adult_test_accounts set enabled=false where user_id=$1",
      [ids.tutor],
    );
    row = (await workspace("champion")).tutor_reviews.find(
      (t) => t.tutor_id === ids.tutor,
    );
    assert.equal(
      row.target_active,
      false,
      "inactive approved tutor remains revocable",
    );
    await review("champion", row.token, "revoked");
    await db.query(
      "update public.adult_test_accounts set enabled=true where user_id=$1",
      [ids.tutor],
    );
    row = (await workspace("champion")).tutor_reviews.find(
      (t) => t.tutor_id === ids.tutor,
    );
    await db.query(
      "insert into public.tutor_languages(tutor_id,language) values($1,'हिन्दी')",
      [ids.tutor],
    );
    await assert.rejects(review("admin", row.token, "approved"), {
      code: "40001",
    });
    // A previously successful intent is still denied when its actor loses access.
    if (winner === "champion") {
      await db.query(
        "update public.adult_test_accounts set enabled=false where user_id=$1",
        [ids.champion],
      );
      await assert.rejects(review("champion", token, "approved", request), {
        code: "42501",
      });
      await db.query(
        "update public.adult_test_accounts set enabled=true where user_id=$1",
        [ids.champion],
      );
    }
    const link = (revision, status) =>
      run(
        "admin",
        "select public.review_test_relationship($1,$2,$3,$4,$5,$6) v",
        [
          ids.guardian,
          ids.learner,
          revision,
          status,
          "Synthetic controlled relationship decision.",
          randomUUID(),
        ],
      );
    await link(0, "approved");
    let rel = (await workspace("guardian")).relationships[0];
    const consent = (
      grant,
      requestId = randomUUID(),
      expectedEvent = rel.consent_event,
    ) =>
      run("guardian", "select public.record_test_consent($1,$2,$3,$4,$5) v", [
        rel.id,
        expectedEvent,
        grant,
        "Explicit synthetic adult test consent choice.",
        requestId,
      ]);
    const approvalRequest = randomUUID(),
      competingRequest = randomUUID(),
      pendingEvent = rel.consent_event;
    const approvals = await Promise.allSettled([
      consent(true, approvalRequest),
      consent(true, competingRequest),
    ]);
    assert.equal(approvals.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      approvals.find((r) => r.status === "rejected").reason.code,
      "40001",
    );
    // Capture the winning intent so an old successful delivery can race a fresh
    // stale approval after withdrawal without recreating approved consent.
    const cachedRequest =
      approvals[0].status === "fulfilled" ? approvalRequest : competingRequest;
    rel = (await workspace("guardian")).relationships[0];
    const approvedEvent = rel.consent_event;
    await db.query(
      "update public.adult_test_accounts set enabled=false where user_id=$1",
      [ids.learner],
    );
    await assert.rejects(
      run("guardian", "select public.read_linked_test_learner($1) v", [rel.id]),
      { code: "42501" },
    );
    rel = (await workspace("guardian")).relationships[0];
    assert.equal(rel.can_share, false);
    await consent(false); // withdrawal must remain possible when a linked target is disabled
    const revoked = (await workspace("guardian")).relationships[0];
    const deliveries = await Promise.allSettled([
      consent(true, randomUUID(), approvedEvent),
      consent(true, cachedRequest, pendingEvent),
    ]);
    assert.equal(deliveries[0].status, "rejected");
    // A new stale approval is denied even before the revision check when the
    // target is inactive. Cached replay returns its old audit ID, doing no write.
    assert.equal(deliveries[0].reason.code, "42501");
    assert.equal(deliveries[1].status, "fulfilled");
    assert.deepEqual((await workspace("guardian")).relationships[0], revoked);
    // With an active target, stale event rejection (rather than its access gate)
    // still prevents a delayed approval from superseding withdrawal.
    await db.query(
      "update public.adult_test_accounts set enabled=true where user_id=$1",
      [ids.learner],
    );
    const activeDeliveries = await Promise.allSettled([
      consent(true, randomUUID(), approvedEvent),
      consent(true, cachedRequest, pendingEvent),
    ]);
    assert.equal(activeDeliveries[0].status, "rejected");
    assert.equal(activeDeliveries[0].reason.code, "40001");
    assert.equal(activeDeliveries[1].status, "fulfilled");
    assert.equal(
      (await workspace("guardian")).relationships[0].consent_event,
      revoked.consent_event,
    );
    await assert.rejects(
      run("guardian", "select public.read_linked_test_learner($1) v", [rel.id]),
      { code: "42501" },
    );
    await db.query(
      "update public.adult_test_accounts set enabled=false where user_id=$1",
      [ids.learner],
    );
    await link(1, "revoked"); // likewise unlinking disabled participants
    await db.query(
      "update public.adult_test_accounts set enabled=true where user_id=$1",
      [ids.learner],
    );
    await link(2, "approved");
    rel = (await workspace("guardian")).relationships[0];
    assert.equal(rel.consent_status, "pending");
    assert.equal(rel.can_share, false);
    await assert.rejects(
      run("guardian", "select public.read_linked_test_learner($1) v", [rel.id]),
      { code: "42501" },
    );
    // Append enough actual consent decisions to prove bounded, stable cursor history.
    for (let i = 0; i < 22; i++) {
      await consent(i % 2 === 0);
      rel = (await workspace("guardian")).relationships[0];
    }
    const page1 = await run(
      "guardian",
      "select public.load_test_trust_history('consent',$1) v",
      [rel.id],
    );
    const page2 = await run(
      "guardian",
      "select public.load_test_trust_history('consent',$1,$2) v",
      [rel.id, page1.next_before],
    );
    assert.equal(page1.records.length, 20);
    assert.equal(page1.more, true);
    assert.ok(page2.records.length > 0);
    assert.equal(
      new Set([...page1.records, ...page2.records].map((r) => r.event_number))
        .size,
      page1.records.length + page2.records.length,
    );
    console.log(
      "PASS trust contention: one reviewer/consent wins, replay cannot override withdrawal, current-session checks, metadata conflicts, inactive-target revocation/withdrawal, relink requires fresh consent, bounded history cursors",
    );
  } finally {
    await db.query(
      "delete from public.test_trust_audit where actor_id=any($1::uuid[])",
      [all],
    );
    await db.query(
      "delete from public.guardian_consent_records where recorded_by=any($1::uuid[])",
      [all],
    );
    await db.query(
      "delete from public.guardian_relationships where guardian_id=$1",
      [ids.guardian],
    );
    await db.query(
      "delete from public.tutor_verification_records where tutor_id=$1",
      [ids.tutor],
    );
    await db.query("delete from public.tutor_test_evidence where tutor_id=$1", [
      ids.tutor,
    ]);
    await db.query("delete from auth.users where id=any($1::uuid[])", [all]);
    await db.end();
  }
}
