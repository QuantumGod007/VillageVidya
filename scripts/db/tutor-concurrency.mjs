import pg from "pg";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
// Runs on the caller's disposable/isolated local database, never a hosted service.
export async function testTutorConcurrency(connectionString) {
  const admin = new pg.Client({ connectionString });
  await admin.connect();
  const owner = randomUUID();
  async function operation(sql, values) {
    const client = new pg.Client({ connectionString });
    await client.connect();
    try {
      await client.query("begin");
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claims',$1,true)", [
        JSON.stringify({ sub: owner, session_id: owner }),
      ]);
      const result = await client.query(sql, values);
      await client.query("commit");
      return result;
    } finally {
      await client.end();
    }
  }
  const save = (id, rev, start, end, day = 1) =>
    operation(
      "select public.save_tutor_availability($1,$2,$3::smallint,$4::time,$5::time,true)",
      [id, rev, day, start, end],
    );
  try {
    await admin.query(
      "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
      [owner, `vv-concurrency-${owner}@example.invalid`],
    );
    await admin.query(
      "insert into public.profiles(id,display_name) values($1,'Disposable adult tutor SQL fixture')",
      [owner],
    );
    await admin.query(
      "insert into public.user_roles(user_id,role) values($1,'tutor')",
      [owner],
    );
    await admin.query(
      "insert into public.tutor_profiles(user_id,academic_grade) values($1,12)",
      [owner],
    );
    await admin.query(
      "insert into public.adult_test_accounts(user_id,enabled) values($1,true)",
      [owner],
    );
    await admin.query("insert into auth.sessions(id,user_id) values($1,$1)", [
      owner,
    ]);
    const id = randomUUID();
    const duplicate = await Promise.allSettled(
      Array.from({ length: 8 }, () => save(id, null, "10:00", "11:00")),
    );
    assert.equal(
      duplicate.filter((r) => r.status === "fulfilled").length,
      8,
      "duplicate delivery is idempotent",
    );
    assert.equal(
      (
        await admin.query(
          "select count(*)::int n from public.tutor_availability where tutor_id=$1",
          [owner],
        )
      ).rows[0].n,
      1,
    );
    const overlap = await Promise.allSettled([
      save(randomUUID(), null, "12:00", "13:00"),
      save(randomUUID(), null, "12:30", "13:30"),
    ]);
    assert.equal(
      overlap.filter((r) => r.status === "fulfilled").length,
      1,
      "one competing overlapping interval wins",
    );
    assert.equal(
      overlap.find((r) => r.status === "rejected").reason.code,
      "23P01",
    );
    const edit = await Promise.allSettled([
      save(id, 1, "09:00", "10:00"),
      save(id, 1, "08:00", "09:00"),
    ]);
    assert.equal(
      edit.filter((r) => r.status === "fulfilled").length,
      1,
      "one same-revision edit wins",
    );
    assert.equal(
      edit.find((r) => r.status === "rejected").reason.code,
      "40001",
    );
    await save(randomUUID(), null, "15:00", "16:00");
    const bound = await Promise.allSettled([
      save(randomUUID(), null, "17:00", "18:00"),
      save(randomUUID(), null, "19:00", "20:00"),
    ]);
    assert.equal(
      bound.filter((r) => r.status === "fulfilled").length,
      1,
      "daily capacity survives competing requests",
    );
    assert.equal(
      bound.find((r) => r.status === "rejected").reason.code,
      "23514",
    );
    const bio = await Promise.allSettled([
      operation("select public.save_tutor_bio('First',1)"),
      operation("select public.save_tutor_bio('Second',1)"),
    ]);
    assert.equal(
      bio.filter((r) => r.status === "fulfilled").length,
      1,
      "one concurrent bio edit wins",
    );
    assert.equal(bio.find((r) => r.status === "rejected").reason.code, "40001");
    console.log(
      "PASS tutor concurrency: duplicate delivery, overlap exclusion, stale edits, count bounds and biography conflicts",
    );
  } finally {
    await admin.query("delete from auth.users where id=$1", [owner]);
    await admin.end();
  }
}
