set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000004"}',true);
select pg_temp.assert_true((select count(*)=0 from public.lesson_progress), 'pending relationship and consent grant no access');
select pg_temp.expect_error($q$update public.guardian_relationships set status='approved'$q$,'42501','guardian cannot approve their relationship');
select pg_temp.expect_error($q$insert into public.guardian_consent_records(relationship_id,status,recorded_by,policy_version,decision_note) values ('10000000-0000-0000-0000-000000000001','approved',auth.uid(),'v1','forged')$q$,'42501','guardian cannot manufacture verified consent');
reset role;
-- Fictional trusted decisions made inside this rolled-back test only.
update public.guardian_relationships set status='approved',reviewed_by='00000000-0000-0000-0000-000000000005',reviewed_at=now();
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.lesson_progress), 'approved relationship without approved consent remains closed');
reset role;
insert into public.guardian_consent_records(relationship_id,status,recorded_by,policy_version,decision_note) values
 ('10000000-0000-0000-0000-000000000001','approved','00000000-0000-0000-0000-000000000005','test-only','Fictional test approval, never real consent.');
set local role authenticated;
select pg_temp.assert_true((select count(*)=1 and min(lesson_id)='equations' from public.lesson_progress), 'verified related guardian can read only the linked learner progress');
select pg_temp.assert_true((select count(*)=2 from public.profiles), 'related guardian sees own and linked learner profile');
select pg_temp.assert_true((select count(*)=0 from public.assessment_attempts), 'guardian does not receive private answer details');
select pg_temp.assert_true((select count(*)=0 from public.learner_bookmarks), 'guardian does not receive private bookmarks');
update public.profiles set display_name='forged' where id='00000000-0000-0000-0000-000000000001';
select pg_temp.assert_true((select count(*)=0 from public.profiles where display_name='forged'), 'guardian cannot edit linked learner profile');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000007"}',true);
select pg_temp.assert_true((select count(*)=0 from public.lesson_progress), 'unrelated guardian cannot read progress');
select pg_temp.assert_true((select count(*)=0 from public.guardian_relationships), 'unrelated guardian cannot read relationships');
select pg_temp.assert_true((select count(*)=0 from public.guardian_consent_records), 'unrelated guardian cannot read consent evidence');
reset role;
insert into public.guardian_consent_records(relationship_id,status,recorded_by,policy_version,decision_note) values
 ('10000000-0000-0000-0000-000000000001','revoked','00000000-0000-0000-0000-000000000005','test-only','Fictional revocation.');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000004"}',true);
select pg_temp.assert_true((select count(*)=0 from public.lesson_progress), 'latest revocation overrides earlier approval');
select pg_temp.expect_error($q$delete from public.guardian_consent_records$q$,'42501','untrusted clients cannot erase revocation');
reset role;
