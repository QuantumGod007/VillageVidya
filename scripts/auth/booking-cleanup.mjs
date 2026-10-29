// Privileged disposal of explicitly owned local test fixtures, never a browser
// retention endpoint. Call inside the caller's cleanup transaction.
export async function cleanupTestBookings(db, ids) {
  const outside = await db.query(
    `select 1 from public.test_tutor_requests where
    (learner_id=any($1::uuid[]) or tutor_id=any($1::uuid[]))
    and not(learner_id=any($1::uuid[]) and tutor_id=any($1::uuid[])) limit 1`,
    [ids],
  );
  if (outside.rowCount)
    throw new Error("Outside-account bookings exist; fixture cleanup refused.");
  const records = (
    await db.query(
      "select id from public.test_tutor_requests where learner_id=any($1::uuid[]) and tutor_id=any($1::uuid[])",
      [ids],
    )
  ).rows.map((r) => r.id);
  if (
    (
      await db.query(
        "select 1 from public.test_booking_events where request_id=any($1::uuid[]) and not(actor_id=any($2::uuid[])) limit 1",
        [records, ids],
      )
    ).rowCount
  )
    throw new Error("Outside actor history exists; fixture cleanup refused.");
  await db.query(
    "delete from public.test_booking_events where request_id=any($1::uuid[])",
    [records],
  );
  await db.query(
    "delete from public.test_booking_intents where actor_id=any($1::uuid[])",
    [ids],
  );
  await db.query(
    "update public.test_tutor_requests set session_id=null where id=any($1::uuid[])",
    [records],
  );
  await db.query(
    "delete from public.test_scheduled_sessions where request_id=any($1::uuid[])",
    [records],
  );
  await db.query(
    "delete from public.test_tutor_requests where id=any($1::uuid[])",
    [records],
  );
}
