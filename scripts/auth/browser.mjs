import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect as browserExpect } from "@playwright/test";
import { build, preview } from "vite";
import pg from "pg";
import { localConfig, transientClient } from "./local.mjs";
import {
  prepareClassroom,
  cleanupClassroom,
  classroomRepositories,
} from "./classroom.mjs";

// Real production assets, browser sign-in, GoTrue, PostgREST and PostgreSQL.
// No request interception, seeded approvals, session injection or UI fixtures.
const config = localConfig();
await mkdir("tmp", { recursive: true });
const output = await mkdtemp(resolve("tmp/browser-"));
const db = new pg.Client({ connectionString: config.databaseUrl });
let server, browser, manifest, otherManifest;
const contexts = [];
const expect = browserExpect.configure({ timeout: 15_000 });
const homes = {
  learner: "/learn",
  champion: "/champion",
  guardian: "/guardian",
  admin: "/admin",
  tutor: "/studio",
};
try {
  await db.connect();
  await build({
    logLevel: "error",
    define: {
      "import.meta.env.VITE_APP_MODE": JSON.stringify("supabase"),
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(config.url),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        config.publicKey,
      ),
    },
    build: { outDir: output },
  });
  server = await preview({
    build: { outDir: output },
    preview: { host: "127.0.0.1", port: 5175, strictPort: true },
  });
  manifest = await prepareClassroom(config, { acknowledged: true });
  browser = await chromium.launch();
  const pages = {};
  for (const role of Object.keys(homes)) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    contexts.push(context);
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    await page.goto("http://127.0.0.1:5175/account/sign-in");
    await page
      .getByLabel("Email address", { exact: true })
      .fill(manifest.accounts[role].email);
    await page
      .getByLabel("Password", { exact: true })
      .fill(manifest.accounts[role].password);
    await page
      .getByRole("button", { name: "Sign in securely", exact: true })
      .click();
    await page.waitForURL(`http://127.0.0.1:5175${homes[role]}`);
    pages[role] = page;
  }
  const ready = async (page) =>
    expect(
      page.getByRole("button", { name: "Refresh trust records", exact: true }),
    ).toBeEnabled();
  const confirm = async (page) => {
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm test action", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Adult-test decision recorded" }),
    ).toBeVisible();
  };
  const { champion, admin, guardian, learner, tutor: tutorPage } = pages;
  const tutorId = manifest.accounts.tutor.id;
  const tutor = champion
    .locator("#verification .trust-card")
    .filter({ hasText: tutorId });
  await champion.goto("http://127.0.0.1:5175/champion#verification");
  await ready(champion);
  await expect(champion.locator("#verification")).toBeFocused();
  for (const [decision, label] of [
    ["rejected", "Rejected test record"],
    ["approved", "Approved test record"],
    ["revoked", "Revoked"],
  ]) {
    await tutor
      .getByRole("combobox", { name: "Test decision", exact: true })
      .selectOption(decision);
    await tutor
      .getByLabel("Decision reason", { exact: true })
      .fill(`Synthetic browser ${decision} decision for the adult classroom.`);
    await tutor
      .getByRole("button", { name: "Review test decision", exact: true })
      .click();
    await confirm(champion);
    await champion.reload();
    await ready(champion);
    await expect(tutor.locator(".trust-status")).toHaveText(label);
  }
  console.log(
    "PASS real browser: Champion reject/approve/revoke, hash focus and persistence after reload",
  );

  await ready(admin);
  await admin
    .getByRole("combobox", { name: "Guardian test account ID", exact: true })
    .fill(manifest.accounts.guardian.id);
  await admin
    .getByRole("combobox", { name: "Learner test account ID", exact: true })
    .fill(manifest.accounts.learner.id);
  await admin
    .getByLabel("Relationship decision reason", { exact: true })
    .fill("Synthetic browser administration of an adult test link.");
  await admin
    .getByRole("button", { name: "Establish test link", exact: true })
    .click();
  await confirm(admin);
  await guardian.goto("http://127.0.0.1:5175/guardian#consent");
  await ready(guardian);
  await expect(
    guardian.getByText("Consent: Pending", { exact: true }),
  ).toBeVisible();
  const privateLearner = guardian.getByRole("heading", {
    name: "Synthetic adult classroom learner",
    exact: true,
  });
  await expect(privateLearner).toHaveCount(0);
  for (const [action, label] of [
    ["Grant test consent", "Consent: Approved test record"],
    ["Withdraw test consent", "Consent: Revoked"],
  ]) {
    await guardian
      .getByLabel("Test consent reason", { exact: true })
      .fill(`Synthetic browser choice: ${action} for this adult tester.`);
    await guardian.getByRole("button", { name: action, exact: true }).click();
    await confirm(guardian);
    await guardian.reload();
    await ready(guardian);
    await expect(guardian.getByText(label, { exact: true })).toBeVisible();
    if (action === "Grant test consent")
      await expect(privateLearner).toBeVisible();
    else await expect(privateLearner).toHaveCount(0);
  }
  await admin
    .getByRole("button", { name: "Refresh trust records", exact: true })
    .click();
  await ready(admin);
  await admin
    .getByLabel("Link revocation reason", { exact: true })
    .fill("Synthetic browser test link is no longer required.");
  await admin
    .getByRole("button", { name: "Revoke test link", exact: true })
    .click();
  await confirm(admin);
  console.log(
    "PASS real browser: admin link/unlink, guardian grant/withdraw and private-data visibility after reload",
  );

  const summary = `SYNTHETIC adult browser report ${randomUUID()}; no real incident.`;
  await learner.goto("http://127.0.0.1:5175/safety");
  await ready(learner);
  await learner
    .getByLabel("Synthetic report summary", { exact: true })
    .fill(summary);
  await learner
    .getByLabel("This describes a synthetic adult-test scenario.", {
      exact: true,
    })
    .check();
  await learner
    .getByRole("button", { name: "Submit test report", exact: true })
    .click();
  await expect(
    learner.locator("article.trust-card").filter({ hasText: summary }),
  ).toBeVisible();
  await champion.goto("http://127.0.0.1:5175/champion#reports");
  await ready(champion);
  const report = champion
    .locator("#reports .trust-card")
    .filter({ hasText: summary });
  for (const [status, label] of [
    ["under_review", "Under review"],
    ["closed", "Closed"],
  ]) {
    await report
      .getByRole("combobox", { name: "Next report status", exact: true })
      .selectOption(status);
    await report
      .getByLabel("Private review action", { exact: true })
      .fill(`Synthetic independent browser review: ${status}.`);
    await report
      .getByRole("button", { name: "Review safety action", exact: true })
      .click();
    await confirm(champion);
    await expect(report.locator(".trust-status")).toHaveText(label);
  }
  await learner.reload();
  await ready(learner);
  await expect(
    learner
      .locator("article.trust-card")
      .filter({ hasText: summary })
      .locator(".trust-status"),
  ).toHaveText("Closed");
  await expect(
    learner.getByText(/Synthetic independent browser review/),
  ).toHaveCount(0);
  const history = (
    await db.query(
      "select actor_id, to_status from public.test_safety_actions where report_id=(select id from public.test_safety_reports where summary=$1) order by event_number",
      [summary],
    )
  ).rows;
  assert.deepEqual(history, [
    { actor_id: manifest.accounts.learner.id, to_status: "submitted" },
    { actor_id: manifest.accounts.champion.id, to_status: "under_review" },
    { actor_id: manifest.accounts.champion.id, to_status: "closed" },
  ]);
  console.log(
    "PASS real browser: report submission, independent review/closure, reporter privacy and PostgreSQL audit identities",
  );

  // Re-enable a synthetic approval through the real Champion UI. Qualifications
  // remain operator-supplied test metadata; preference/enrollment setup below
  // uses the same authenticated repositories as the application.
  await champion.goto("http://127.0.0.1:5175/champion#verification");
  await ready(champion);
  await tutor
    .getByRole("combobox", { name: "Test decision", exact: true })
    .selectOption("approved");
  await tutor
    .getByLabel("Decision reason", { exact: true })
    .fill("Synthetic adult browser scheduling approval only.");
  await tutor
    .getByRole("button", { name: "Review test decision", exact: true })
    .click();
  await confirm(champion);
  const factories = await classroomRepositories();
  const setupClients = {};
  for (const role of ["learner", "tutor"]) {
    const account = manifest.accounts[role],
      client = transientClient(config.url, config.publicKey);
    assert.ifError(
      (
        await client.auth.signInWithPassword({
          email: account.email,
          password: account.password,
        })
      ).error,
    );
    setupClients[role] = client;
  }
  const tutorRepository = factories.supabaseTutorRepository(setupClients.tutor);
  await tutorRepository.setDiscoveryPreview(
    true,
    (await tutorRepository.load()).profile.revision,
  );
  const start = (
    await db.query(
      "select (date_trunc('day',clock_timestamp() at time zone 'Asia/Kolkata')+interval '1 day 16 hours') at time zone 'Asia/Kolkata' v",
    )
  ).rows[0].v;
  const localDate = new Date(+start + 330 * 60_000).toISOString().slice(0, 10);
  const weekday = new Date(`${localDate}T00:00:00Z`).getUTCDay();
  await tutorRepository.saveAvailability({
    id: randomUUID(),
    revision: null,
    weekday,
    starts_at: "16:00",
    ends_at: "17:00",
    enabled: true,
  });
  await factories
    .supabaseLearnerRepository(setupClients.learner)
    .enroll("cbse-8-mathematics", "English");
  const tutorPreview = (await tutorRepository.load()).profile
    .discovery_preview_id;
  await learner.goto("http://127.0.0.1:5175/tutors");
  const candidate = learner
    .locator("article.discovery-card")
    .filter({ hasText: `Test tutor ${tutorPreview.slice(0, 8)}` });
  await expect(candidate).toBeVisible();
  await candidate
    .getByRole("link", { name: "Request adult-test session", exact: true })
    .click();
  await expect(
    learner.getByRole("button", { name: "Send test request", exact: true }),
  ).toBeEnabled();
  await learner
    .getByLabel("Session date (IST)", { exact: true })
    .fill(localDate);
  await learner
    .getByLabel("Session start time (IST)", { exact: true })
    .fill("16:00");
  await learner
    .getByLabel("Learning topic (optional)", { exact: true })
    .fill("Synthetic browser fractions practice");
  await learner
    .getByRole("button", { name: "Send test request", exact: true })
    .click();
  await learner.waitForURL("**/sessions?record=*");
  const sharedRequest = new URL(learner.url()).searchParams.get("record");
  assert.ok(sharedRequest);
  await expect(
    learner
      .getByRole("article", { name: `Request ${sharedRequest}`, exact: true })
      .locator(".trust-status"),
  ).toHaveText("Pending");
  await tutorPage.goto("http://127.0.0.1:5175/studio#requests");
  const inbox = tutorPage.getByRole("article", {
    name: `Request ${sharedRequest}`,
    exact: true,
  });
  await expect(inbox).toBeVisible();
  await expect(tutorPage.locator("#requests")).toBeFocused();
  await inbox
    .getByRole("button", { name: "Accept test request", exact: true })
    .click();
  await expect(inbox.locator(".trust-status")).toHaveText("Accepted");
  await learner
    .getByRole("button", { name: "Refresh requests and sessions", exact: true })
    .click();
  const ownRequest = learner.getByRole("article", {
    name: `Request ${sharedRequest}`,
    exact: true,
  });
  await expect(ownRequest.locator(".trust-status")).toHaveText("Accepted");
  const room = await ownRequest
    .getByRole("link", { name: "View confirmed session", exact: true })
    .getAttribute("href");
  await ownRequest
    .getByRole("link", { name: "View confirmed session", exact: true })
    .click();
  await learner.reload();
  const sharedSession = room.split("/").at(-1);
  await expect(
    learner
      .getByRole("article", { name: `Session ${sharedSession}`, exact: true })
      .locator(".trust-status"),
  ).toHaveText("Scheduled");
  const booked = (
    await db.query(
      "select learner_id,tutor_id,status from public.test_scheduled_sessions where id=$1",
      [sharedSession],
    )
  ).rows[0];
  assert.deepEqual(booked, {
    learner_id: manifest.accounts.learner.id,
    tutor_id: manifest.accounts.tutor.id,
    status: "scheduled",
  });
  const bookingActors = (
    await db.query(
      "select actor_id,to_status from public.test_booking_events where request_id=$1 order by event_number",
      [sharedRequest],
    )
  ).rows;
  assert.deepEqual(bookingActors, [
    { actor_id: manifest.accounts.learner.id, to_status: "pending" },
    { actor_id: manifest.accounts.tutor.id, to_status: "accepted" },
    { actor_id: manifest.accounts.tutor.id, to_status: "scheduled" },
  ]);
  console.log(
    "PASS real browser: discovery → actual learner request → separate tutor acceptance → same confirmed session after learner reload, verified in PostgreSQL",
  );

  for (const [role, page] of Object.entries(pages)) {
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(async () => {
        const size = await page.locator("html").evaluate((root) => ({
          content: root.scrollWidth,
          viewport: root.clientWidth,
        }));
        assert.ok(
          size.content <= size.viewport + 1,
          `${role} overflows at ${width}px`,
        );
      }).toPass({ timeout: 15_000 });
    }
  }
  console.log(
    "PASS real browser: trust, learner session and tutor inbox overflow at 320/768/1280px",
  );
  // Same browser: switch from learner A to an unrelated real learner B. The old
  // room must neither display A's records nor authorize access under B's JWT.
  await learner.setViewportSize({ width: 1280, height: 900 });
  otherManifest = await prepareClassroom(config, { acknowledged: true });
  await learner.getByRole("button", { name: "Sign out", exact: true }).click();
  await learner.waitForURL("**/account/sign-in");
  await learner
    .getByLabel("Email address", { exact: true })
    .fill(otherManifest.accounts.learner.email);
  await learner
    .getByLabel("Password", { exact: true })
    .fill(otherManifest.accounts.learner.password);
  await learner
    .getByRole("button", { name: "Sign in securely", exact: true })
    .click();
  await learner.waitForURL("**/learn");
  await expect(
    learner.getByRole("article", {
      name: `Request ${sharedRequest}`,
      exact: true,
    }),
  ).toHaveCount(0);
  await learner.goto(`http://127.0.0.1:5175${room}`);
  await expect(learner.getByRole("alert")).toBeVisible();
  await expect(
    learner.getByRole("article", {
      name: `Session ${sharedSession}`,
      exact: true,
    }),
  ).toHaveCount(0);
  console.log(
    "PASS real browser: same-browser learner account switching clears prior private records and denies third-party session access",
  );
} finally {
  try {
    for (const context of contexts) await context.close();
    await browser?.close();
    if (manifest) await cleanupClassroom(config, manifest);
    if (otherManifest) await cleanupClassroom(config, otherManifest);
  } finally {
    await db.end();
    if (server) await new Promise((done) => server.httpServer.close(done));
    await rm(output, { recursive: true, force: true });
  }
}
