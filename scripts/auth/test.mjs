import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import ts from "typescript";
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
  for (const details of accounts)
    ids.push(await provisionAdult(config, details));
  const invalid = transientClient(config.url, config.publicKey);
  clients.push(invalid);
  check(
    !!(
      await invalid.auth.signInWithPassword({
        email: accounts[0].email,
        password: "wrong-password",
      })
    ).error,
    "invalid credentials rejected",
  );
  check(
    !!(
      await invalid.auth.signUp({
        email: `closed-${suffix}@example.invalid`,
        password,
      })
    ).error,
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
  await db.query(
    "update public.adult_test_accounts set enabled=false where user_id=$1",
    [ids[1]],
  );
  await assert.rejects(() => verifiedAccount(tutor));
  assertions++;
  console.log("PASS disabled adult access fails closed");
  // Recovery uses GoTrue's real generated recovery token. Local SMTP delivery
  // itself is not asserted; this verifies token exchange and password update.
  const recovery = await server.auth.admin.generateLink({
    type: "recovery",
    email: accounts[3].email,
  });
  assert.ifError(recovery.error);
  const recovering = transientClient(config.url, config.publicKey);
  clients.push(recovering);
  check(
    !(
      await recovering.auth.verifyOtp({
        token_hash: recovery.data.properties.hashed_token,
        type: "recovery",
      })
    ).error,
    "real recovery token accepted",
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
  console.log(
    `Real Supabase Auth/API integration passed: ${assertions} checks. No real child registration or tutoring was enabled.`,
  );
} finally {
  for (const client of clients) await client.auth.signOut().catch(() => {});
  // No consent or verification audit rows are created by these tests.
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
