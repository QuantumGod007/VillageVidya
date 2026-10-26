import assert from "node:assert/strict";
import {
  prepareClassroom,
  exerciseClassroom,
  cleanupClassroom,
} from "./classroom.mjs";
import { testDiscoveryApi } from "./discovery-tests.mjs";
import { testTutorApi } from "./tutor-tests.mjs";
import { randomUUID, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { build } from "vite";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { localConfig, transientClient } from "./local.mjs";
import { provisionAdult } from "./provision.mjs";
// Exercise the actual identity resolver against GoTrue + PostgREST, not a mock.
const compiled = ts.transpileModule(
  await readFile("src/lib/auth/account.ts", "utf8"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  },
).outputText;
const { verifiedAccount } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const bundle = await build({
  configFile: false,
  logLevel: "silent",
  build: {
    write: false,
    minify: false,
    lib: { entry: "scripts/auth/learner-entry.ts", formats: ["es"] },
  },
});
const {
  supabaseLearnerRepository,
  supabaseTutorRepository,
  supabaseDiscoveryRepository,
} = await import(
  `data:text/javascript;base64,${Buffer.from((Array.isArray(bundle) ? bundle[0] : bundle).output[0].code).toString("base64")}`
);
const config = localConfig();
// Database resets can briefly leave the gateway's Auth upstream reconnecting.
// Probe the real service, with a bounded wait; never replace it with a fixture.
let ready = false;
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    const response = await fetch(`${config.url}/auth/v1/health`, {
      headers: { apikey: config.publicKey },
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      ready = true;
      break;
    }
  } catch {
    /* The local stack may still be reconnecting after reset. */
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!ready)
  throw new Error("Local Auth gateway is not healthy after database reset.");
const server = transientClient(config.url, config.serverKey);
const db = new pg.Client({ connectionString: config.databaseUrl });
await db.connect();
const ids = [];
const clients = [];
const suffix = randomUUID();
const password = randomBytes(24).toString("base64url");
let assertions = 0;
function check(value, label) {
  assert.ok(value, label);
  assertions++;
  console.log(`PASS ${label}`);
}
const account = (role, n = "") => ({
  email: `vv-auth-${role}${n}-${suffix}@example.invalid`,
  password,
  name: `Adult ${role} test`,
  role,
  adultAcknowledged: true,
});
async function login(details) {
  const client = transientClient(config.url, config.publicKey);
  clients.push(client);
  const result = await client.auth.signInWithPassword({
    email: details.email,
    password,
  });
  if (result.error)
    throw new Error(
      `Local ${details.role} sign-in failed (code: ${result.error.code ?? "unknown"}, status: ${result.error.status ?? "unknown"}): ${result.error.message}`,
    );
  check(
    !result.error && result.data.session,
    `${details.role} can actually sign in`,
  );
  return { client, session: result.data.session };
}
try {
  const accounts = ["learner", "tutor", "guardian", "champion", "admin"].map(
    (r) => account(r),
  );
  accounts.push(account("learner", "2"));
  accounts.push(account("tutor", "2"));
  for (const details of accounts)
    ids.push(await provisionAdult(config, details));
  const invalid = transientClient(config.url, config.publicKey);
  clients.push(invalid);
  check(
    (
      await invalid.auth.signInWithPassword({
        email: accounts[0].email,
        password: "wrong-password",
      })
    ).error?.code === "invalid_credentials",
    "invalid credentials rejected",
  );
  check(
    (
      await invalid.auth.signUp({
        email: `closed-${suffix}@example.invalid`,
        password,
      })
    ).error?.code === "signup_disabled",
    "public signup remains closed",
  );
  const signed = [];
  for (const details of accounts) {
    const result = await login(details);
    signed.push(result);
    const identity = await verifiedAccount(result.client);
    check(
      identity.roles.length === 1 &&
        identity.roles[0] === details.role &&
        identity.profile.display_name === details.name,
      `${details.role} identity and trusted role resolved`,
    );
  }
  const learner = signed[0].client,
    tutor = signed[1].client,
    guardian = signed[2].client,
    admin = signed[4].client;
  check(
    (await learner.from("profiles").select("*").eq("id", ids[5])).data
      ?.length === 0,
    "cross-account profile denied over API",
  );
  check(
    (await admin.from("profiles").select("*")).data?.length === 1,
    "app admin cannot bypass private RLS",
  );
  check(
    !!(
      await learner
        .from("user_roles")
        .insert({ user_id: ids[0], role: "admin" })
    ).error,
    "role escalation rejected",
  );
  await learner.auth.updateUser({
    data: { role: "admin", adult: true, verified: true },
  });
  check(
    (await verifiedAccount(learner)).roles.join() === "learner",
    "user metadata cannot assign roles",
  );
  check(
    !!(
      await tutor
        .from("tutor_profiles")
        .update({ teaching_skill_score: 100 })
        .eq("user_id", ids[1])
    ).error,
    "trusted tutor score cannot be forged",
  );
  check(
    !!(
      await tutor.from("tutor_verification_records").insert({
        tutor_id: ids[1],
        status: "approved",
        reviewed_by: ids[1],
        verified_grade: 12,
        decision_note: "forged",
      })
    ).error,
    "self verification rejected",
  );
  const relation = await server
    .from("guardian_relationships")
    .insert({ guardian_id: ids[2], learner_id: ids[0] })
    .select()
    .single();
  assert.ifError(relation.error);
  check(
    !!(
      await guardian
        .from("guardian_relationships")
        .update({ status: "approved" })
        .eq("id", relation.data.id)
    ).error,
    "fake guardian approval rejected",
  );
  check(
    !!(
      await guardian.from("guardian_consent_records").insert({
        relationship_id: relation.data.id,
        status: "approved",
        recorded_by: ids[2],
        policy_version: "forged",
        decision_note: "forged",
      })
    ).error,
    "fake guardian consent rejected",
  );
  check(
    (await guardian.from("profiles").select("*").eq("id", ids[0])).data
      ?.length === 0,
    "unapproved guardian cannot access learner",
  );
  const learnerRepo = supabaseLearnerRepository(learner);
  await learnerRepo.enroll("cbse-8-mathematics", "English");
  check(
    (await learnerRepo.enrollments()).filter((e) => e.is_active).length === 1,
    "academic selection persisted through real repository",
  );
  const concurrent = await Promise.all([
    learner.rpc("switch_learner_enrollment", {
      p_subject_id: "cbse-6-mathematics",
      p_language: "English",
    }),
    learner.rpc("switch_learner_enrollment", {
      p_subject_id: "cbse-8-mathematics",
      p_language: "English",
    }),
  ]);
  check(
    concurrent.every((r) => !r.error) &&
      (await learnerRepo.enrollments()).filter((e) => e.is_active).length === 1,
    "concurrent enrolment switches serialize with one active context",
  );
  check(
    !!(
      await learner.rpc("switch_learner_enrollment", {
        p_subject_id: "missing",
        p_language: "English",
      })
    ).error,
    "invalid published context rejected by API",
  );
  await learnerRepo.setBookmark("equations", true);
  await learnerRepo.setBookmark("equations", true);
  check(
    (await learnerRepo.bookmarks()).length === 1,
    "bookmark save is persistent and idempotent",
  );
  await learnerRepo.recordReading("equations", false);
  check(
    (await learnerRepo.activity())[0].read_at === null,
    "opening records started without completion",
  );
  await Promise.all([
    learnerRepo.recordReading("equations", true),
    learnerRepo.recordReading("equations", true),
  ]);
  check(
    (await learnerRepo.activity()).length === 1 &&
      !!(await learnerRepo.activity())[0].read_at,
    "reading completion is persistent and idempotent",
  );
  check(
    (await learnerRepo.progress()).length === 0 &&
      (await learnerRepo.attempts()).length === 0,
    "reading never creates checkpoint or assessment scores",
  );
  const otherRepo = supabaseLearnerRepository(signed[5].client);
  check(
    (await otherRepo.activity()).length === 0 &&
      (await otherRepo.bookmarks()).length === 0,
    "other learner has no access to first learner records",
  );
  check(
    !!(
      await signed[5].client
        .from("learner_lesson_activity")
        .insert({ learner_id: ids[0], lesson_id: "equations" })
    ).error,
    "forged activity ownership rejected",
  );
  check(
    !!(
      await learner.from("lesson_progress").insert({
        learner_id: ids[0],
        lesson_id: "equations",
        checkpoint_percent: 100,
      })
    ).error,
    "reading client still cannot submit trusted mastery",
  );
  check(
    !!(
      await learner.from("assessment_attempts").insert({
        learner_id: ids[0],
        lesson_id: "equations",
        assessment_id: "equations-checkpoint",
        selected_option: 0,
        score_percent: 100,
      })
    ).error,
    "reading client still cannot submit assessment scores",
  );
  check(
    !!(await invalid.from("learner_lesson_activity").select("*")).error,
    "anonymous reading access denied",
  );
  await assert.rejects(() =>
    supabaseLearnerRepository(tutor).recordReading("equations", true),
  );
  assertions++;
  console.log("PASS non-learner repository cannot record reading");
  const restored = transientClient(config.url, config.publicKey);
  clients.push(restored);
  check(
    !(
      await restored.auth.setSession({
        access_token: signed[0].session.access_token,
        refresh_token: signed[0].session.refresh_token,
      })
    ).error && (await verifiedAccount(restored)).id === ids[0],
    "genuine session restoration",
  );
  const secondRepo = supabaseLearnerRepository(restored);
  check(
    (await secondRepo.enrollments()).some((e) => e.is_active) &&
      (await secondRepo.bookmarks()).length === 1 &&
      !!(await secondRepo.activity())[0].read_at,
    "second authenticated client restores enrolment, bookmark and reading",
  );
  await secondRepo.enroll("cbse-6-mathematics", "English");
  check(
    (await secondRepo.bookmarks()).length === 1 &&
      (await secondRepo.activity()).length === 1,
    "context changes preserve earlier reading and saved records",
  );
  await secondRepo.setBookmark("equations", false);
  await secondRepo.setBookmark("equations", false);
  check(
    (await secondRepo.bookmarks()).length === 0,
    "unsave persists and repeated removal is idempotent",
  );
  await secondRepo.setBookmark("equations", true);
  const refreshed = await restored.auth.refreshSession();
  check(
    !refreshed.error && !!refreshed.data.session,
    "real refresh token exchange succeeds",
  );
  const invalidApi = await fetch(`${config.url}/rest/v1/profiles?select=*`, {
    headers: {
      apikey: config.publicKey,
      Authorization: "Bearer invalid-session",
    },
  });
  check(invalidApi.status === 401, "invalid access JWT rejected at API");
  const sessionId = JSON.parse(
    Buffer.from(
      refreshed.data.session.access_token.split(".")[1],
      "base64url",
    ).toString(),
  ).session_id;
  await db.query(
    "update auth.sessions set not_after=now()-interval '1 minute' where id=$1",
    [sessionId],
  );
  check(
    (await restored.from("profiles").select("*")).data?.length === 0,
    "expired server session denied despite unexpired JWT",
  );
  check(
    (await restored.from("learner_lesson_activity").select("*")).data
      ?.length === 0,
    "expired session loses new private activity reads",
  );
  check(
    !!(
      await restored.rpc("record_learner_reading", {
        p_lesson_id: "water",
        p_mark_read: true,
      })
    ).error,
    "expired session cannot write reading activity",
  );
  check(
    !!(await restored.auth.refreshSession()).error,
    "expired session cannot refresh",
  );
  await assert.rejects(() => verifiedAccount(restored));
  assertions++;
  console.log("PASS expired identity fails closed");
  const again = await login(accounts[0]);
  const revokeToken = again.session.access_token;
  check(
    !(await again.client.auth.signOut({ scope: "global" })).error,
    "real server sign-out succeeds",
  );
  check(
    (await again.client.auth.getSession()).data.session === null,
    "sign-out clears client session",
  );
  const replay = await fetch(`${config.url}/rest/v1/profiles?select=*`, {
    headers: {
      apikey: config.publicKey,
      Authorization: `Bearer ${revokeToken}`,
    },
  });
  check(
    replay.ok && (await replay.json()).length === 0,
    "signed-out JWT cannot replay private data",
  );
  check(
    !!(
      await transientClient(config.url, config.publicKey).auth.refreshSession({
        refresh_token: again.session.refresh_token,
      })
    ).error,
    "signed-out refresh token revoked",
  );
  const relogged = await login(accounts[0]);
  const reloggedRepo = supabaseLearnerRepository(relogged.client);
  check(
    (await reloggedRepo.enrollments()).some((e) => e.is_active) &&
      (await reloggedRepo.bookmarks()).length === 1 &&
      !!(await reloggedRepo.activity())[0].read_at,
    "new sign-in retrieves persistent learning records",
  );
  await Promise.all([
    otherRepo.recordReading("water", false),
    otherRepo.recordReading("water", true),
  ]);
  check(
    (await otherRepo.activity()).filter(
      (a) => a.lesson_id === "water" && a.read_at,
    ).length === 1,
    "concurrent first-start and read actions retain one completed reading record",
  );
  const revokedActivity = await fetch(
    `${config.url}/rest/v1/learner_lesson_activity?select=*`,
    {
      headers: {
        apikey: config.publicKey,
        Authorization: `Bearer ${revokeToken}`,
      },
    },
  );
  check(
    revokedActivity.ok && (await revokedActivity.json()).length === 0,
    "signed-out token cannot replay reading history",
  );
  await testTutorApi({
    repo: supabaseTutorRepository,
    tutor,
    learner,
    anonymous: transientClient(config.url, config.publicKey),
    other: signed[6].client,
    server,
    config,
    check,
    ownerId: ids[1],
    otherId: ids[6],
    reviewerId: ids[3],
    tutorSession: signed[1].session,
    loginAgain: async () => (await login(accounts[1])).client,
    restore: async (session) => {
      const client = transientClient(config.url, config.publicKey);
      clients.push(client);
      assert.ifError(
        (
          await client.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          })
        ).error,
      );
      return client;
    },
  });
  await testDiscoveryApi({
    discoveryRepo: supabaseDiscoveryRepository,
    tutorRepo: supabaseTutorRepository,
    learner: relogged.client,
    otherLearner: signed[5].client,
    tutor,
    otherTutor: (await login(accounts[6])).client,
    guardian,
    champion: signed[3].client,
    admin,
    anonymous: transientClient(config.url, config.publicKey),
    server,
    db,
    ownerId: ids[1],
    otherId: ids[6],
    reviewerId: ids[3],
    config,
    check,
  });
  await db.query(
    "update public.adult_test_accounts set enabled=false where user_id=$1",
    [ids[1]],
  );
  await assert.rejects(() => verifiedAccount(tutor));
  assertions++;
  console.log("PASS disabled adult access fails closed");
  await assert.rejects(() => supabaseTutorRepository(tutor).load());
  check(
    !!(await tutor.rpc("save_tutor_bio", { p_bio: "disabled", p_revision: 1 }))
      .error,
    "disabled adult tutor gate blocks RPC as well as reads",
  );
  // Test the same PKCE recovery flow as the browser, through the real local
  // SMTP capture. No recovery link or credential is printed or sent externally.
  const recovering = createClient(config.url, config.publicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
  clients.push(recovering);
  const reset = await recovering.auth.resetPasswordForEmail(accounts[3].email, {
    redirectTo: "http://127.0.0.1:5173/account/recovery",
  });
  check(!reset.error, "real password recovery email requested");
  let messageId;
  for (let attempt = 0; attempt < 15; attempt++) {
    const messages = await (
      await fetch("http://127.0.0.1:54324/api/v1/messages", {
        signal: AbortSignal.timeout(3000),
      })
    ).json();
    messageId = messages.messages?.find((m) =>
      m.To?.some((to) => to.Address === accounts[3].email),
    )?.ID;
    if (messageId) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  check(!!messageId, "recovery email captured by local SMTP");
  const mail = await (
    await fetch(`http://127.0.0.1:54324/api/v1/message/${messageId}`)
  ).json();
  const links = [...mail.HTML.matchAll(/href=["']([^"']+)["']/g)].map((m) =>
    m[1].replaceAll("&amp;", "&"),
  );
  const verification = links.find((link) => {
    const u = new URL(link);
    return u.origin === config.url && u.pathname === "/auth/v1/verify";
  });
  check(!!verification, "recovery link targets the local Auth server");
  const redirect = await fetch(verification, { redirect: "manual" });
  const location = new URL(redirect.headers.get("location"));
  check(
    location.origin === "http://127.0.0.1:5173" &&
      location.pathname === "/account/recovery" &&
      !!location.searchParams.get("code"),
    "recovery redirects to the allowed account screen with a PKCE code",
  );
  const exchange = await recovering.auth.exchangeCodeForSession(
    location.searchParams.get("code"),
  );
  check(
    !exchange.error && !!exchange.data.session,
    "real PKCE recovery code exchanged for a session",
  );
  const newPassword = randomBytes(24).toString("base64url");
  check(
    !(await recovering.auth.updateUser({ password: newPassword })).error,
    "recovery updates password through Auth",
  );
  await recovering.auth.signOut();
  check(
    !(
      await recovering.auth.signInWithPassword({
        email: accounts[3].email,
        password: newPassword,
      })
    ).error,
    "recovered account can sign in with new password",
  );
  const classroom = await prepareClassroom(config, { acknowledged: true });
  try {
    await exerciseClassroom(config, classroom, check);
    await exerciseClassroom(config, classroom, check);
    check(
      true,
      "same classroom batch supports a second complete Auth/API exercise",
    );
  } finally {
    await cleanupClassroom(config, classroom);
    check(
      (
        await db.query(
          "select count(*)::int n from auth.users where id=any($1::uuid[])",
          [Object.values(classroom.accounts).map((a) => a.id)],
        )
      ).rows[0].n === 0,
      "classroom cleanup removes only the disposable batch",
    );
  }
  console.log(
    `Real Supabase Auth/API integration passed: ${assertions} checks. No real child registration or tutoring was enabled.`,
  );
} finally {
  for (const client of clients) await client.auth.signOut().catch(() => {});
  // Test-only cleanup of explicitly disposable evidence; service API cannot erase audit history.
  await db.query(
    "delete from public.tutor_verification_records where tutor_id=any($1::uuid[])",
    [ids],
  );
  await db.query(
    "delete from public.guardian_relationships where guardian_id=any($1::uuid[])",
    [ids],
  );
  for (const id of ids.reverse()) {
    const result = await server.auth.admin.deleteUser(id);
    if (result.error) {
      console.error("Auth test cleanup failed; reset the local stack.");
      process.exitCode = 1;
    }
  }
  await db.end();
}
