import { randomUUID, randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import assert from "node:assert/strict";
import { localConfig, transientClient } from "./local.mjs";
import { provisionAdult } from "./provision.mjs";
const roles = ["learner", "tutor", "champion", "guardian", "admin"];
export function assertClassroomLocal(config) {
  for (const value of [config.url, config.databaseUrl])
    if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(value).hostname))
      throw new Error(
        "Classroom tooling refuses remote services and never resets databases.",
      );
}
async function verifyManifest(db, manifest) {
  if (
    manifest.kind !== "synthetic-adult-classroom" ||
    manifest.version !== 1 ||
    !manifest.batch
  )
    throw new Error("Not a classroom manifest.");
  for (const role of roles) {
    const a = manifest.accounts[role];
    if (
      !a ||
      a.email !== `vv-classroom-${manifest.batch}-${role}@example.invalid`
    )
      throw new Error("Invalid classroom account manifest.");
    const result = await db.query(
      "select u.email from auth.users u join public.adult_test_accounts t on t.user_id=u.id join public.user_roles r on r.user_id=u.id and r.role=$2 where u.id=$1",
      [a.id, role],
    );
    if (result.rows.length !== 1 || result.rows[0].email !== a.email)
      throw new Error(
        "Manifest does not match the disposable local accounts. No data was reset or removed.",
      );
  }
}
export async function prepareClassroom(config, { acknowledged = false } = {}) {
  assertClassroomLocal(config);
  if (!acknowledged)
    throw new Error("Explicit synthetic adult-test acknowledgement required.");
  const manifest = {
    version: 1,
    kind: "synthetic-adult-classroom",
    batch: randomUUID(),
    createdAt: new Date().toISOString(),
    accounts: {},
  };
  const server = transientClient(config.url, config.serverKey);
  const db = new pg.Client({ connectionString: config.databaseUrl });
  await db.connect();
  try {
    for (const role of roles) {
      const account = {
        email: `vv-classroom-${manifest.batch}-${role}@example.invalid`,
        password: randomBytes(24).toString("base64url"),
        name: `Synthetic adult classroom ${role}`,
        role,
        adultAcknowledged: true,
      };
      const id = await provisionAdult(config, account);
      manifest.accounts[role] = {
        id,
        email: account.email,
        password: account.password,
      };
    }
    await db.query("begin");
    const tutor = manifest.accounts.tutor.id,
      admin = manifest.accounts.admin.id;
    await db.query(
      "insert into public.tutor_subject_qualifications(tutor_id,subject_id) values($1,'cbse-8-mathematics')",
      [tutor],
    );
    await db.query(
      "insert into public.tutor_languages(tutor_id,language) values($1,'English')",
      [tutor],
    );
    await db.query(
      "update public.tutor_profiles set teaching_skill_score=75 where user_id=$1",
      [tutor],
    );
    await db.query(
      "insert into public.tutor_test_evidence(tutor_id,prepared_by,note) values($1,$2,'SYNTHETIC CLASSROOM ONLY: sample CBSE Grade 8 Mathematics / English metadata and sample TSS 75, prepared by the isolated local operator. No physical identity, academic document or real teaching evaluation was verified.')",
      [tutor, admin],
    );
    await db.query("commit");
    return manifest;
  } catch (error) {
    await db.query("rollback").catch(() => {});
    const failures = [];
    for (const a of Object.values(manifest.accounts)) {
      try {
        const result = await server.auth.admin.deleteUser(a.id);
        if (result.error) failures.push(a.id);
      } catch {
        failures.push(a.id);
      }
    }
    if (failures.length)
      throw new Error(
        `Preparation failed; operator cleanup is required for these disposable account IDs: ${failures.join(", ")}`,
        { cause: error },
      );
    throw error;
  } finally {
    await db.end();
  }
}
export async function cleanupClassroom(config, manifest) {
  assertClassroomLocal(config);
  const db = new pg.Client({ connectionString: config.databaseUrl });
  await db.connect();
  try {
    await verifyManifest(db, manifest);
    await db.query("begin");
    const ids = roles.map((r) => manifest.accounts[r].id);
    const links = (
      await db.query(
        "select id,guardian_id,learner_id,reviewed_by from public.guardian_relationships where guardian_id=any($1::uuid[]) or learner_id=any($1::uuid[])",
        [ids],
      )
    ).rows;
    if (
      links.some(
        (r) =>
          ![r.guardian_id, r.learner_id, r.reviewed_by]
            .filter(Boolean)
            .every((id) => ids.includes(id)),
      )
    )
      throw new Error(
        "Classroom accounts have relationships with outside accounts; cleanup refused.",
      );
    const linkIds = links.map((r) => r.id),
      reportIds = (
        await db.query(
          "select id from public.test_safety_reports where reporter_id=any($1::uuid[])",
          [ids],
        )
      ).rows.map((r) => r.id);
    const subjects = [...ids, ...linkIds, ...reportIds];
    const outside = await db.query(
      `select 1 from public.test_trust_audit where (actor_id=any($1::uuid[]) and not(subject_id=any($2::uuid[]))) or (subject_id=any($2::uuid[]) and not(actor_id=any($1::uuid[])))
      union all select 1 from public.tutor_verification_records where (tutor_id=any($1::uuid[]) and not(reviewed_by=any($1::uuid[]))) or (reviewed_by=any($1::uuid[]) and not(tutor_id=any($1::uuid[])))
      union all select 1 from public.guardian_consent_records where (relationship_id=any($3::uuid[]) and not(recorded_by=any($1::uuid[]))) or (recorded_by=any($1::uuid[]) and not(relationship_id=any($3::uuid[])))
      union all select 1 from public.test_safety_actions where (report_id=any($4::uuid[]) and not(actor_id=any($1::uuid[]))) or (actor_id=any($1::uuid[]) and not(report_id=any($4::uuid[])))
      union all select 1 from public.tutor_test_evidence where (tutor_id=any($1::uuid[]) and not(prepared_by=any($1::uuid[]))) or (prepared_by=any($1::uuid[]) and not(tutor_id=any($1::uuid[]))) limit 1`,
      [ids, subjects, linkIds, reportIds],
    );
    if (outside.rowCount)
      throw new Error(
        "Outside-account audit references exist; cleanup refused to preserve unrelated history.",
      );
    await db.query(
      "delete from public.test_trust_audit where subject_id=any($1::uuid[])",
      [subjects],
    );
    await db.query(
      "delete from public.test_safety_actions where report_id=any($1::uuid[])",
      [reportIds],
    );
    await db.query(
      "delete from public.test_safety_reports where id=any($1::uuid[])",
      [reportIds],
    );
    await db.query(
      "delete from public.guardian_consent_records where relationship_id=any($1::uuid[])",
      [linkIds],
    );
    await db.query(
      "delete from public.guardian_relationships where id=any($1::uuid[])",
      [linkIds],
    );
    await db.query(
      "delete from public.tutor_test_evidence where tutor_id=any($1::uuid[])",
      [ids],
    );
    await db.query(
      "delete from public.tutor_verification_records where tutor_id=any($1::uuid[])",
      [ids],
    );
    await db.query("delete from auth.users where id=any($1::uuid[])", [ids]);
    await db.query("commit");
  } catch (e) {
    await db.query("rollback").catch(() => {});
    throw e;
  } finally {
    await db.end();
  }
}
let repositories;
export async function classroomRepositories() {
  if (repositories) return repositories;
  const { build } = await import("vite");
  const bundle = await build({
    configFile: false,
    logLevel: "silent",
    build: {
      write: false,
      minify: false,
      lib: { entry: "scripts/auth/trust-entry.ts", formats: ["es"] },
    },
  });
  repositories = await import(
    `data:text/javascript;base64,${Buffer.from((Array.isArray(bundle) ? bundle[0] : bundle).output[0].code).toString("base64")}`
  );
  return repositories;
}
export async function exerciseClassroom(
  config,
  manifest,
  check = (value, label) => {
    assert.ok(value, label);
    console.log(`PASS ${label}`);
  },
) {
  assertClassroomLocal(config);
  const db = new pg.Client({ connectionString: config.databaseUrl });
  await db.connect();
  const {
    supabaseTrustRepository: trust,
    supabaseTutorRepository: tutors,
    supabaseLearnerRepository: learners,
    supabaseDiscoveryRepository: discovery,
  } = await classroomRepositories();
  const clients = {};
  async function login(role) {
    const a = manifest.accounts[role],
      client = transientClient(config.url, config.publicKey);
    const result = await client.auth.signInWithPassword({
      email: a.email,
      password: a.password,
    });
    assert.ifError(result.error);
    clients[role] = client;
    return client;
  }
  try {
    await verifyManifest(db, manifest);
    for (const role of roles) await login(role);
    const repos = Object.fromEntries(roles.map((r) => [r, trust(clients[r])])),
      tutorId = manifest.accounts.tutor.id,
      guardianId = manifest.accounts.guardian.id,
      learnerId = manifest.accounts.learner.id;
    const findReview = async () =>
      (await repos.champion.load()).tutor_reviews.find(
        (r) => r.tutor_id === tutorId,
      );
    let row = await findReview();
    check(
      !!row?.evidence && row.approval_missing.length === 0,
      "classroom prepares labelled synthetic metadata through the local operator",
    );
    check(
      (await repos.learner.load()).tutor_reviews.length === 0 &&
        (await repos.guardian.load()).accounts.length === 0,
      "classroom least-privilege queue projections",
    );
    await assert.rejects(() =>
      repos.learner.reviewTutor({
        tutorId,
        token: row.token,
        status: "approved",
        grade: 10,
        reason: "Unauthorised classroom approval attempt.",
        requestId: randomUUID(),
      }),
    );
    check(true, "learner cannot approve a test tutor");
    await assert.rejects(() =>
      repos.guardian.reviewTutor({
        tutorId,
        token: row.token,
        status: "revoked",
        grade: null,
        reason: "Unauthorised classroom revocation attempt.",
        requestId: randomUUID(),
      }),
    );
    check(true, "guardian cannot revoke a tutor");
    if (row.status === "approved") {
      await repos.champion.reviewTutor({
        tutorId,
        token: row.token,
        status: "revoked",
        grade: null,
        reason: "Synthetic exercise begins with a new independent review.",
        requestId: randomUUID(),
      });
      row = await findReview();
    }
    const stale = row.token,
      approval = {
        tutorId,
        token: row.token,
        status: "approved",
        grade: 10,
        reason:
          "Reviewed labelled synthetic classroom qualifications; test approval only.",
        requestId: randomUUID(),
      };
    await Promise.all([
      repos.champion.reviewTutor(approval),
      repos.champion.reviewTutor(approval),
    ]);
    const history = await repos.champion.history("tutor", tutorId);
    check(
      history.records[0].status === "approved" &&
        history.records[0].actor_id === manifest.accounts.champion.id,
      "real Champion Auth session records the review identity and test approval",
    );
    check(
      history.records.filter((e) => e.note.includes(approval.reason)).length ===
        1,
      "duplicate review delivery produces one immutable event",
    );
    await assert.rejects(() =>
      repos.admin.reviewTutor({
        tutorId,
        token: stale,
        status: "revoked",
        grade: null,
        reason: "Stale classroom review must be rejected.",
        requestId: randomUUID(),
      }),
    );
    check(true, "stale independent reviewer decision rejected");
    check(
      !!(
        await clients.champion.rpc("review_test_tutor", {
          p_tutor_id: tutorId,
          p_token: row.token,
          p_status: "approved",
          p_grade: 10,
          p_reason: "Forged reviewer must be rejected.",
          p_request_id: randomUUID(),
          p_reviewed_by: manifest.accounts.admin.id,
        })
      ).error,
      "forged reviewer parameter rejected at API boundary",
    );
    check(
      !!(
        await clients.champion.from("tutor_verification_records").insert({
          tutor_id: tutorId,
          status: "approved",
          reviewed_by: manifest.accounts.champion.id,
          verified_grade: 10,
          decision_note: "Forged direct review.",
        })
      ).error,
      "Champion browser cannot bypass audited review with direct table write",
    );
    const tutorRepo = tutors(clients.tutor);
    let profile = (await tutorRepo.load()).profile;
    await tutorRepo.setDiscoveryPreview(true, profile.revision);
    await learners(clients.learner).enroll("cbse-8-mathematics", "English");
    const filters = {
      subjectId: "cbse-8-mathematics",
      language: "English",
      query: "",
      weekday: 1,
      startsAt: "16:00",
      endsAt: "17:00",
      preferenceOnly: false,
    };
    profile = (await tutorRepo.load()).profile;
    check(
      (await discovery(clients.learner).search(filters)).candidates.some(
        (c) => c.preview_id === profile.discovery_preview_id,
      ),
      "reviewed and opted-in classroom tutor genuinely enters Phase 9 discovery",
    );
    const freshLearner = await login("learner");
    check(
      (await discovery(freshLearner).search(filters)).candidates.some(
        (c) => c.preview_id === profile.discovery_preview_id,
      ),
      "fresh learner sign-in restores the real discovery result",
    );
    row = await findReview();
    await repos.champion.reviewTutor({
      tutorId,
      token: row.token,
      status: "revoked",
      grade: null,
      reason: "Synthetic classroom approval revoked by the reviewer.",
      requestId: randomUUID(),
    });
    check(
      !(await discovery(clients.learner).search(filters)).candidates.some(
        (c) => c.preview_id === profile.discovery_preview_id,
      ),
      "committed authorised revocation removes classroom tutor from matching",
    );
    check(
      (await tutorRepo.load()).verification[0].status === "revoked",
      "tutor workspace repository sees latest committed review",
    );
    let links = (await repos.admin.load()).relationships,
      link = links.find(
        (r) => r.guardian_id === guardianId && r.learner_id === learnerId,
      );
    if (!link || link.status !== "approved")
      await repos.admin.relationship({
        guardianId,
        learnerId,
        revision: link?.revision ?? 0,
        status: "approved",
        reason:
          "Independently established synthetic adult classroom relationship.",
        requestId: randomUUID(),
      });
    link = (await repos.guardian.load()).relationships.find(
      (r) => r.guardian_id === guardianId && r.learner_id === learnerId,
    );
    if (link.consent_status === "approved") {
      await repos.guardian.consent({
        relationshipId: link.id,
        expectedEvent: link.consent_event,
        grant: false,
        reason: "Synthetic exercise resets previously granted test consent.",
        requestId: randomUUID(),
      });
      link = (await repos.guardian.load()).relationships.find(
        (r) => r.id === link.id,
      );
    }
    await assert.rejects(() => repos.guardian.learner(link.id));
    check(
      true,
      "administratively established link alone cannot disclose learner records",
    );
    await assert.rejects(() =>
      repos.guardian.relationship({
        guardianId,
        learnerId,
        revision: link.revision,
        status: "revoked",
        reason: "Guardian cannot administer their own relationship.",
        requestId: randomUUID(),
      }),
    );
    check(true, "guardian cannot establish or revoke their own verified link");
    const consent = {
      relationshipId: link.id,
      expectedEvent: link.consent_event,
      grant: true,
      reason: "Explicit adult classroom consent under the test-only policy.",
      requestId: randomUUID(),
    };
    await Promise.all([
      repos.guardian.consent(consent),
      repos.guardian.consent(consent),
    ]);
    const records = await repos.guardian.learner(link.id);
    check(
      records.test_only &&
        records.enrollments.some(
          (e) => e.is_active && e.subject_id === "cbse-8-mathematics",
        ),
      "test consent permits genuine linked adult academic records",
    );
    await assert.rejects(() => repos.admin.learner(link.id));
    await assert.rejects(() => repos.tutor.learner(link.id));
    check(
      true,
      "admin and unrelated tutor cannot read private linked learner records",
    );
    await assert.rejects(() =>
      repos.guardian.consent({
        ...consent,
        grant: false,
        requestId: randomUUID(),
      }),
    );
    check(
      true,
      "stale consent withdrawal rejected without overriding a newer event",
    );
    link = (await repos.guardian.load()).relationships.find(
      (r) => r.id === link.id,
    );
    await repos.guardian.consent({
      relationshipId: link.id,
      expectedEvent: link.consent_event,
      grant: false,
      reason: "Explicit withdrawal of adult classroom test consent.",
      requestId: randomUUID(),
    });
    await assert.rejects(() => repos.guardian.learner(link.id));
    check(
      (await clients.guardian.from("profiles").select("id").eq("id", learnerId))
        .data?.length === 0,
      "withdrawal removes linked private reads in RPC and underlying RLS",
    );
    check(
      (await repos.guardian.history("consent", link.id)).records[0].status ===
        "revoked",
      "immutable consent history records latest withdrawal",
    );
    link = (await repos.guardian.load()).relationships.find(
      (r) => r.id === link.id,
    );
    await repos.guardian.consent({
      relationshipId: link.id,
      expectedEvent: link.consent_event,
      grant: true,
      reason: "Fresh synthetic test consent before unlink demonstration.",
      requestId: randomUUID(),
    });
    await repos.admin.relationship({
      guardianId,
      learnerId,
      revision: link.revision,
      status: "revoked",
      reason: "Administrative classroom unlink overrides prior consent.",
      requestId: randomUUID(),
    });
    await assert.rejects(() => repos.guardian.learner(link.id));
    check(true, "authorised unlink overrides even previously approved consent");
    const input = {
      submissionId: randomUUID(),
      category: "content",
      summary:
        "SYNTHETIC ADULT CLASSROOM: demonstration concern; no real incident or child data.",
    };
    const ids = await Promise.all([
      repos.learner.submitReport(input),
      repos.learner.submitReport(input),
    ]);
    check(
      ids[0] === ids[1] && ids[0] !== input.submissionId,
      "duplicate real submissions share one server-generated report identifier",
    );
    const reportId = ids[0];
    await assert.rejects(() =>
      repos.learner.reviewReport({
        reportId,
        revision: 1,
        status: "resolved",
        note: "Unauthorised reporter decision must fail.",
        requestId: randomUUID(),
      }),
    );
    check(true, "reporter cannot process their own report");
    await assert.rejects(() =>
      repos.champion.reviewReport({
        reportId,
        revision: 1,
        status: "resolved",
        note: "The under-review state cannot be skipped.",
        requestId: randomUUID(),
      }),
    );
    check(true, "trusted boundary rejects invalid safety transitions");
    const raced = await Promise.allSettled([
      repos.champion.reviewReport({
        reportId,
        revision: 1,
        status: "under_review",
        note: "Champion begins independent synthetic review.",
        requestId: randomUUID(),
      }),
      repos.admin.reviewReport({
        reportId,
        revision: 1,
        status: "under_review",
        note: "Admin begins independent synthetic review.",
        requestId: randomUUID(),
      }),
    ]);
    check(
      raced.filter((r) => r.status === "fulfilled").length === 1,
      "concurrent independent reviewers cannot overwrite a report revision",
    );
    const resolution = {
      reportId,
      revision: 2,
      status: "resolved",
      note: "Synthetic classroom concern resolved. Private reviewer-only evidence.",
      requestId: randomUUID(),
    };
    await Promise.all([
      repos.champion.reviewReport(resolution),
      repos.champion.reviewReport(resolution),
    ]);
    const own = (await repos.learner.load()).reports.find(
      (r) => r.id === reportId,
    );
    check(
      own.status === "resolved" && own.revision === 3,
      "reporter sees durable resolved status and server revision",
    );
    check(
      !JSON.stringify(await repos.learner.load()).includes(
        "reviewer-only evidence",
      ),
      "reporter projections omit private review evidence",
    );
    await assert.rejects(() => repos.learner.history("safety", reportId));
    check(
      !!(await clients.learner.from("test_safety_actions").select("*")).error,
      "reporter cannot read private action history through RPC or table",
    );
    check(
      (await repos.champion.history("safety", reportId)).records.length === 3,
      "safety action history remains immutable and replay-safe",
    );
    await assert.rejects(() =>
      repos.champion.reviewReport({
        ...resolution,
        revision: 3,
        status: "under_review",
        requestId: randomUUID(),
      }),
    );
    check(
      true,
      "terminal report cannot be reopened by a stale or new browser intent",
    );
    const ownStaffReport = await repos.champion.submitReport({
      submissionId: randomUUID(),
      category: "other",
      summary: "SYNTHETIC staff report to prove independent-review separation.",
    });
    await assert.rejects(() =>
      repos.champion.reviewReport({
        reportId: ownStaffReport,
        revision: 1,
        status: "under_review",
        note: "Self review is not a permitted staff action.",
        requestId: randomUUID(),
      }),
    );
    check(true, "staff cannot review their own safety report");
    await db.query(
      "update auth.users set banned_until=now()+interval '1 hour' where id=$1",
      [manifest.accounts.champion.id],
    );
    await assert.rejects(() => repos.champion.load());
    await db.query("update auth.users set banned_until=null where id=$1", [
      manifest.accounts.champion.id,
    ]);
    check(true, "banned reviewer sessions lose queue access");
    await db.query(
      "update public.adult_test_accounts set enabled=false where user_id=$1",
      [guardianId],
    );
    await assert.rejects(() => repos.guardian.load());
    await db.query(
      "update public.adult_test_accounts set enabled=true where user_id=$1",
      [guardianId],
    );
    check(true, "disabled adult test access cannot read trust records");
    const session = (await clients.guardian.auth.getSession()).data.session;
    const sessionId = JSON.parse(
      Buffer.from(session.access_token.split(".")[1], "base64url").toString(),
    ).session_id;
    await db.query(
      "update auth.sessions set not_after=now()-interval '1 minute' where id=$1",
      [sessionId],
    );
    await assert.rejects(() => repos.guardian.load());
    await login("guardian");
    check(true, "expired server session denied despite unexpired access JWT");
    check(
      (await repos.admin.load()).recent_actions.some(
        (a) => a.subject_id === tutorId,
      ),
      "administrator sees actual audited test operations",
    );
    const anon = transientClient(config.url, config.publicKey);
    check(
      !!(await anon.rpc("load_test_trust_workspace", {})).error,
      "anonymous access to all trust queues remains denied",
    );
    return { tutorId, relationshipId: link.id, reportId };
  } finally {
    await db.end();
  }
}
function manifestPath(argument) {
  const root = resolve("tmp"),
    file = resolve(argument ?? "tmp/adult-classroom.json");
  if (relative(root, file).startsWith("..") || file === root)
    throw new Error(
      "Keep classroom credential manifests inside the ignored tmp directory.",
    );
  return file;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [command, fileArg] = process.argv.slice(2),
    file = manifestPath(fileArg),
    config = localConfig();
  if (
    process.env.VV_ADULT_TEST_ACCOUNT !== "true" ||
    process.env.VV_SYNTHETIC_CLASSROOM !== "true"
  )
    throw new Error(
      "Set VV_ADULT_TEST_ACCOUNT=true and VV_SYNTHETIC_CLASSROOM=true for explicit local-only fixture work.",
    );
  if (command === "prepare") {
    try {
      await stat(file);
      throw new Error(
        "Manifest already exists. Clean up that batch or choose another tmp filename.",
      );
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    const manifest = await prepareClassroom(config, { acknowledged: true });
    try {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(manifest, null, 2), {
        mode: 0o600,
        flag: "wx",
      });
    } catch (e) {
      await cleanupClassroom(config, manifest);
      throw e;
    }
    console.log(
      `Prepared five disposable adult test accounts. Private login manifest: ${file}. No verification, relationship or consent was approved.`,
    );
  } else {
    const info = await stat(file);
    if (info.mode & 0o077)
      throw new Error(
        "Credential manifest must be owner-readable only (mode 0600).",
      );
    const manifest = JSON.parse(await readFile(file, "utf8"));
    if (command === "exercise") {
      await exerciseClassroom(config, manifest);
      console.log(
        "Real local classroom journey passed. All approvals and consent records are test-only.",
      );
    } else if (command === "cleanup") {
      await cleanupClassroom(config, manifest);
      console.log(
        "Only the verified disposable classroom accounts and their synthetic records were removed. The manifest remains for your local disposal.",
      );
    } else
      throw new Error(
        "Use prepare, exercise or cleanup with a tmp manifest path.",
      );
  }
}
