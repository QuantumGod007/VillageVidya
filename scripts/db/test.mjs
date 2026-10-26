import pg from "pg";
import { testTrustConcurrency } from "./trust-concurrency.mjs";
import { testBookingConcurrency } from "./booking-concurrency.mjs";
import { testDiscoveryDatabase } from "./discovery-verification.mjs";
import { testTutorConcurrency } from "./tutor-concurrency.mjs";
import { readFile, readdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
const native = process.argv.includes("--native");
const connectionString = process.env.VV_TEST_DATABASE_URL;
if (!connectionString)
  throw new Error(
    "Set VV_TEST_DATABASE_URL to an isolated local test database.",
  );
const url = new URL(connectionString);
if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
  throw new Error("Database tests refuse non-loopback hosts.");
const admin = new pg.Client({ connectionString });
await admin.connect();
let tests = 0;
try {
  // Native mode creates/discards only its own random databases. Supabase mode
  // uses CLI-reset local migrations and keeps all test data in a rolled-back tx.
  const passes = native ? 2 : 1;
  for (let round = 0; round < passes; round++) {
    const name = `vv_phase5_test_${randomBytes(6).toString("hex")}`;
    let client = admin;
    let concurrencyUrl = connectionString;
    if (native) {
      await admin.query(`create database "${name}"`);
      const child = new URL(url);
      child.pathname = `/${name}`;
      concurrencyUrl = child.toString();
      client = new pg.Client({ connectionString: child.toString() });
      await client.connect();
    }
    try {
      if (native) {
        await client.query(
          await readFile("scripts/db/native-bootstrap.sql", "utf8"),
        );
        for (const file of (await readdir("supabase/migrations"))
          .filter((f) => f.endsWith(".sql"))
          .sort())
          await client.query(
            await readFile(`supabase/migrations/${file}`, "utf8"),
          );
        await client.query(await readFile("supabase/seed.sql", "utf8"));
      }
      // The seed is safe to repeat and must retain the stable eight lesson IDs.
      await client.query(await readFile("supabase/seed.sql", "utf8"));
      const result = await client.query(
        "select count(*)::int as count from public.lessons",
      );
      assert.equal(result.rows[0].count, 8);
      await client.query("begin");
      try {
        await client.query(
          await readFile("supabase/tests/fixtures.sql", "utf8"),
        );
        const suites = (await readdir("supabase/tests"))
          .filter((f) => f.endsWith(".test.sql"))
          .sort();
        assert.ok(suites.length > 0, "No database test suites found");
        for (const file of suites) {
          await client.query("savepoint suite");
          await client.query(await readFile(`supabase/tests/${file}`, "utf8"));
          await client.query("rollback to savepoint suite");
          await client.query("release savepoint suite");
          console.log(
            `PASS ${file}${native ? ` (fresh/reset pass ${round + 1})` : " (Supabase)"} `,
          );
          tests++;
        }
      } finally {
        await client.query("rollback");
      }
      await testTutorConcurrency(concurrencyUrl);
      await testDiscoveryDatabase(concurrencyUrl);
      await testTrustConcurrency(concurrencyUrl);
      await testBookingConcurrency(concurrencyUrl);
    } finally {
      if (native) {
        await client.end();
        await admin.query(`drop database "${name}" with (force)`);
      }
    }
  }
  console.log(
    `Database suites passed: ${tests}. Native auth fixtures: ${native}; real Supabase database/auth-schema policies: ${!native}.`,
  );
} finally {
  await admin.end();
}
