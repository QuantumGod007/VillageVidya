import pg from "pg";
import { pathToFileURL } from "node:url";
import { localConfig, transientClient } from "./local.mjs";
const roles = ["learner", "tutor", "guardian", "champion", "admin"];
export async function provisionAdult(config, account) {
  const {
    email,
    password,
    name,
    role,
    adultAcknowledged,
    tutorGrade = 12,
  } = account;
  if (
    !adultAcknowledged ||
    !roles.includes(role) ||
    !email?.includes("@") ||
    !name?.trim() ||
    name.trim().length > 80 ||
    !password ||
    password.length < 12 ||
    !Number.isInteger(tutorGrade) ||
    tutorGrade < 4 ||
    tutorGrade > 12
  )
    throw new Error(
      "Provide an adult acknowledgement, valid test role/name/email, password of 12+ characters, and valid tutor grade.",
    );
  for (const value of [config.url, config.databaseUrl])
    if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(value).hostname))
      throw new Error("Local provisioning only.");
  const server = transientClient(config.url, config.serverKey);
  const { data, error } = await server.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error(
      "Local Auth account creation failed; check account details or duplicate email.",
    );
  const id = data.user.id;
  const db = new pg.Client({ connectionString: config.databaseUrl });
  try {
    await db.connect();
    await db.query("begin");
    await db.query(
      "insert into public.profiles(id,display_name) values ($1,$2)",
      [id, name.trim()],
    );
    await db.query(
      "insert into public.user_roles(user_id,role) values ($1,$2)",
      [id, role],
    );
    if (role === "learner")
      await db.query(
        "insert into public.learner_profiles(user_id) values ($1)",
        [id],
      );
    if (role === "tutor")
      await db.query(
        "insert into public.tutor_profiles(user_id,academic_grade) values ($1,$2)",
        [id, tutorGrade],
      );
    await db.query(
      "insert into public.adult_test_accounts(user_id,enabled) values ($1,true)",
      [id],
    );
    await db.query("commit");
    return id;
  } catch (error) {
    await db.query("rollback").catch(() => {});
    const cleanup = await server.auth.admin.deleteUser(id);
    if (cleanup.error)
      throw new Error(
        "Provisioning failed. A local Auth orphan requires trusted cleanup.",
        { cause: error },
      );
    throw error;
  } finally {
    await db.end();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await provisionAdult(localConfig(), {
    email: process.env.VV_AUTH_EMAIL,
    password: process.env.VV_AUTH_PASSWORD,
    name: process.env.VV_AUTH_NAME,
    role: process.env.VV_AUTH_ROLE,
    adultAcknowledged: process.env.VV_ADULT_TEST_ACCOUNT === "true",
    tutorGrade: Number(process.env.VV_TUTOR_GRADE ?? 12),
  });
  console.log(
    "Local adult test account provisioned. No consent or tutor verification was granted.",
  );
}
