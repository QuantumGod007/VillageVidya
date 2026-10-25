import pg from "pg";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { build } from "vite";
let oracle;
async function loadOracle() {
  if (oracle) return oracle;
  const bundle = await build({
    configFile: false,
    logLevel: "silent",
    build: {
      write: false,
      minify: false,
      lib: { entry: "scripts/db/matching-entry.ts", formats: ["es"] },
    },
  });
  const mod = await import(
    `data:text/javascript;base64,${Buffer.from((Array.isArray(bundle) ? bundle[0] : bundle).output[0].code).toString("base64")}`
  );
  oracle = mod.evaluateTutorEvidence;
  return oracle;
}
export async function testDiscoveryDatabase(connectionString) {
  const db = new pg.Client({ connectionString });
  const writer = new pg.Client({ connectionString });
  const reader = new pg.Client({ connectionString });
  await Promise.all([db.connect(), writer.connect(), reader.connect()]);
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  const [learner, tutor, reviewer] = ids;
  try {
    const evaluate = await loadOracle();
    const base = {
      adultTestEnabled: true,
      previewEnabled: true,
      verification: "approved",
      academicGrade: 12,
      verifiedGrade: 10,
      subjectQualified: true,
      languageQualified: true,
      teachingScore: 72.34,
      preferenceMatches: true,
    };
    const variants = [
      {},
      { adultTestEnabled: false },
      { previewEnabled: false },
      { verification: null },
      { verification: "pending" },
      { verification: "rejected" },
      { verification: "revoked" },
      { academicGrade: 7 },
      { verifiedGrade: null },
      { verifiedGrade: 7 },
      { subjectQualified: false },
      { languageQualified: false },
      { teachingScore: null },
      { teachingScore: 49.99 },
      { teachingScore: 50 },
      { teachingScore: 100 },
      { preferenceMatches: false },
      {
        subjectQualified: false,
        languageQualified: false,
        teachingScore: null,
      },
    ];
    for (const variant of variants)
      for (const grade of [4, 8, 10]) {
        const e = { ...base, ...variant },
          expected = evaluate(e, grade);
        const actual = (
          await db.query(
            "select private.evaluate_tutor_match($1,$2,$3::public.review_status,$4::smallint,$5::smallint,$6,$7,$8::numeric,$9,$10::smallint) result",
            [
              e.adultTestEnabled,
              e.previewEnabled,
              e.verification,
              e.academicGrade,
              e.verifiedGrade,
              e.subjectQualified,
              e.languageQualified,
              e.teachingScore,
              e.preferenceMatches,
              grade,
            ],
          )
        ).rows[0].result;
        assert.equal(actual.eligible, expected.eligible);
        assert.deepEqual(actual.reasons, expected.reasons);
        assert.deepEqual(actual.factors, expected.factors);
        if (expected.score === null) assert.equal(actual.score, null);
        else assert.ok(Math.abs(actual.score - expected.score) < 1e-9);
      }
    console.log(
      "PASS discovery SQL/domain parity: 54 grade/trust/qualification/TSS/preference vectors",
    );
    for (let i = 0; i < ids.length; i++) {
      await db.query(
        "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
        [ids[i], `vv-discovery-${ids[i]}@example.invalid`],
      );
      await db.query(
        "insert into public.profiles(id,display_name) values($1,'Disposable adult discovery fixture')",
        [ids[i]],
      );
      await db.query(
        "insert into public.user_roles(user_id,role) values($1,$2)",
        [ids[i], ["learner", "tutor", "champion"][i]],
      );
      await db.query(
        "insert into public.adult_test_accounts(user_id,enabled) values($1,true)",
        [ids[i]],
      );
    }
    await db.query("insert into public.learner_profiles(user_id) values($1)", [
      learner,
    ]);
    await db.query("insert into auth.sessions(id,user_id) values($1,$1)", [
      learner,
    ]);
    await db.query(
      "insert into public.tutor_profiles(user_id,academic_grade,teaching_skill_score,discovery_preview_enabled) values($1,12,75,true)",
      [tutor],
    );
    await db.query(
      "insert into public.tutor_subject_qualifications(tutor_id,subject_id) values($1,'cbse-8-mathematics')",
      [tutor],
    );
    await db.query(
      "insert into public.tutor_languages(tutor_id,language) values($1,'English')",
      [tutor],
    );
    await db.query(
      "insert into public.tutor_availability(tutor_id,weekday,starts_at,ends_at,enabled) values($1,1,'16:00','17:00',true)",
      [tutor],
    );
    await db.query(
      "insert into public.tutor_verification_records(tutor_id,status,reviewed_by,verified_grade,decision_note) values($1,'approved',$2,10,'DISPOSABLE LOCAL TEST; NOT PHYSICAL VERIFICATION')",
      [tutor, reviewer],
    );
    await reader.query("set role authenticated");
    await reader.query("select set_config('request.jwt.claims',$1,false)", [
      JSON.stringify({ sub: learner, session_id: learner }),
    ]);
    const search = async () =>
      (
        await reader.query(
          "select public.discover_test_tutors('cbse-8-mathematics','English','',1::smallint,'16:00'::time,'17:00'::time) result",
        )
      ).rows[0].result;
    const publicId = (
      await db.query(
        "select discovery_preview_id from public.tutor_profiles where user_id=$1",
        [tutor],
      )
    ).rows[0].discovery_preview_id;
    const find = async () =>
      (await search()).candidates.find((c) => c.preview_id === publicId);
    assert.equal((await find()).cms, 95);
    await writer.query("begin");
    await writer.query(
      "insert into public.tutor_verification_records(tutor_id,status,reviewed_by,decision_note) values($1,'revoked',$2,'DISPOSABLE LOCAL TEST: concurrent revocation')",
      [tutor, reviewer],
    );
    await writer.query(
      "update public.tutor_profiles set teaching_skill_score=49 where user_id=$1",
      [tutor],
    );
    assert.equal(
      (await find()).cms,
      95,
      "uncommitted multi-record change cannot produce a mixed candidate",
    );
    await writer.query("commit");
    assert.equal(
      await find(),
      undefined,
      "committed revocation immediately excludes candidate on next query",
    );
    console.log(
      "PASS discovery MVCC: consistent trust/score snapshot and committed revocation on fresh query",
    );
  } finally {
    await writer.query("rollback").catch(() => {});
    await db.query(
      "delete from public.tutor_verification_records where tutor_id=$1",
      [tutor],
    );
    await db.query("delete from auth.users where id=any($1::uuid[])", [ids]);
    await Promise.all([db.end(), writer.end(), reader.end()]);
  }
}
