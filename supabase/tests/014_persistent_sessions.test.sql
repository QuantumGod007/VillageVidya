update public.tutor_availability set enabled=true where tutor_id='00000000-0000-0000-0000-000000000003';
update public.tutor_profiles set discovery_preview_enabled=true where user_id='00000000-0000-0000-0000-000000000003';
insert into public.tutor_verification_records(tutor_id,status,reviewed_by,verified_grade,decision_note) values('00000000-0000-0000-0000-000000000003','approved','00000000-0000-0000-0000-000000000005',10,'ADULT TEST ONLY: synthetic SQL scheduling fixture.');
create temporary table session_fixture as select discovery_preview_id preview,
  (date_trunc('week',clock_timestamp() at time zone 'Asia/Kolkata')+interval '7 days 16 hours') at time zone 'Asia/Kolkata' begins
  from public.tutor_profiles where user_id='00000000-0000-0000-0000-000000000003';
grant select on session_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","session_id":"00000000-0000-0000-0000-000000000001"}',true);
create temporary table session_request as select public.request_test_tutor(gen_random_uuid(),(select preview from session_fixture),'cbse-8-mathematics','English',(select begins from session_fixture),15::smallint,'Persistent schedule') id;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000003","session_id":"00000000-0000-0000-0000-000000000003"}',true);
create temporary table confirmed_session as select public.respond_test_request((select id from session_request),1,'accept','93000000-0000-4000-8000-000000000001') id;
select pg_temp.assert_true(public.respond_test_request((select id from session_request),1,'accept','93000000-0000-4000-8000-000000000001')=(select id from confirmed_session),'duplicate acceptance returns same session');
select pg_temp.assert_true(jsonb_array_length(public.load_test_bookings()->'sessions')=1,'one confirmed reservation');
select pg_temp.expect_error($q$select public.transition_test_session((select id from confirmed_session),1,'complete','',gen_random_uuid())$q$,'22023','cannot complete before start');
select pg_temp.expect_error($q$select public.transition_test_session((select id from confirmed_session),1,'start','',gen_random_uuid())$q$,'22023','future session cannot start');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","session_id":"00000000-0000-0000-0000-000000000001"}',true);
select pg_temp.assert_true(public.load_test_bookings()#>>'{sessions,0,id}'=(select id::text from confirmed_session),'both accounts see same server session');
select pg_temp.expect_error($q$select public.request_test_tutor(gen_random_uuid(),(select preview from session_fixture),'cbse-8-mathematics','English',(select begins from session_fixture),15::smallint,'Conflicting reservation')$q$,'23P01','reserved interval cannot be requested again');
select pg_temp.expect_error($q$update public.test_scheduled_sessions set learner_id='00000000-0000-0000-0000-000000000002'$q$,'42501','client cannot transfer session ownership');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000002","session_id":"00000000-0000-0000-0000-000000000002"}',true);
select pg_temp.expect_error($q$select public.load_test_bookings((select id from confirmed_session))$q$,'42501','unrelated session is private');
select pg_temp.expect_error($q$select public.transition_test_session((select id from confirmed_session),1,'cancel','',gen_random_uuid())$q$,'42501','unrelated actor cannot cancel');
reset role;
-- Move only this disposable owner-created fixture into the current time window.
-- Actual clients have no timestamp or status update grants.
update public.test_scheduled_sessions set starts_at=date_trunc('minute',clock_timestamp())-interval '1 minute',ends_at=date_trunc('minute',clock_timestamp())+interval '14 minutes' where id=(select id from confirmed_session);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","session_id":"00000000-0000-0000-0000-000000000001"}',true);
select public.transition_test_session((select id from confirmed_session),2,'start','Synthetic test session started.','94000000-0000-4000-8000-000000000001');
select public.transition_test_session((select id from confirmed_session),2,'start','Synthetic test session started.','94000000-0000-4000-8000-000000000001');
select public.transition_test_session((select id from confirmed_session),3,'complete','Synthetic text-only practice complete.',gen_random_uuid());
select pg_temp.assert_true(public.load_test_bookings((select id from confirmed_session))#>>'{sessions,0,status}'='completed','completion persists');
select pg_temp.assert_true(public.load_test_bookings((select id from confirmed_session))#>>'{sessions,0,history,1,actor_role}'='learner','server-derived transition actor');
select pg_temp.expect_error($q$select public.transition_test_session((select id from confirmed_session),4,'start','',gen_random_uuid())$q$,'22023','completed session cannot restart');
reset role;
