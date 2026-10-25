-- Explicitly disposable local test identities/evidence, rolled back with suite.
insert into auth.users(id,email,email_confirmed_at)
select ('a0000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'discovery-fixture-'||n||'@example.invalid',now() from generate_series(1,27) n;
insert into public.profiles(id,display_name) select id,'PRIVATE NAME NOT FOR DISCOVERY' from auth.users where email like 'discovery-fixture-%@example.invalid';
insert into public.user_roles(user_id,role) select id,'tutor' from auth.users where email like 'discovery-fixture-%@example.invalid';
insert into public.tutor_profiles(user_id,academic_grade,teaching_skill_score,discovery_preview_enabled,discovery_preview_id,bio)
select id,10,75,true,replace(id::text,'a0000000-','b0000000-')::uuid,'PRIVATE BIO WITH CONTACT example.invalid' from auth.users where email like 'discovery-fixture-%@example.invalid';
insert into public.adult_test_accounts(user_id,enabled) select id,true from auth.users where email like 'discovery-fixture-%@example.invalid';
insert into public.tutor_subject_qualifications(tutor_id,subject_id) select id,'cbse-8-mathematics' from auth.users where email like 'discovery-fixture-%@example.invalid';
insert into public.tutor_languages(tutor_id,language) select id,'English' from auth.users where email like 'discovery-fixture-%@example.invalid';
insert into public.tutor_verification_records(tutor_id,status,reviewed_by,verified_grade,decision_note)
select id,'approved','00000000-0000-0000-0000-000000000005',10,'DISPOSABLE LOCAL TEST; NOT PHYSICAL VERIFICATION' from auth.users where email like 'discovery-fixture-%@example.invalid';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","session_id":"00000000-0000-0000-0000-000000000001"}',true);
create temporary table bounded_result as select public.discover_test_tutors('cbse-8-mathematics','English','',1::smallint,'16:00'::time,'17:00'::time) as result;
select pg_temp.assert_true((select jsonb_array_length(result->'candidates')=24 and (result->>'more_available')::boolean from bounded_result),'bounded response and truthful more-results flag');
select pg_temp.assert_true((select result#>>'{candidates,0,preview_id}'='b0000000-0000-0000-0000-000000000001' and result#>>'{candidates,23,preview_id}'='b0000000-0000-0000-0000-000000000024' from bounded_result),'deterministic tie ranking by opaque ID');
select pg_temp.assert_true((select result::text not like '%PRIVATE%' from bounded_result),'names and bios excluded from projection');
reset role;
-- Remove distinct trust inputs from four candidates; none may leak as eligible.
update public.tutor_profiles set academic_grade=7 where user_id='a0000000-0000-0000-0000-000000000001';
delete from public.tutor_languages where tutor_id='a0000000-0000-0000-0000-000000000002';
delete from public.tutor_subject_qualifications where tutor_id='a0000000-0000-0000-0000-000000000003';
update public.adult_test_accounts set enabled=false where user_id='a0000000-0000-0000-0000-000000000004';
update auth.users set banned_until=now()+interval '1 hour' where id='a0000000-0000-0000-0000-000000000005';
update auth.users set email_confirmed_at=null where id='a0000000-0000-0000-0000-000000000006';
insert into public.tutor_verification_records(tutor_id,status,reviewed_by,decision_note) values
 ('a0000000-0000-0000-0000-000000000007','pending','00000000-0000-0000-0000-000000000005','LOCAL TEST pending overrides approval'),
 ('a0000000-0000-0000-0000-000000000008','rejected','00000000-0000-0000-0000-000000000005','LOCAL TEST rejection overrides approval');
set local role authenticated;
select pg_temp.assert_true(jsonb_array_length(public.discover_test_tutors('cbse-8-mathematics','English')->'candidates')=19,'grade, missing qualifications, disabled, banned, unconfirmed, pending and rejected candidates excluded');
reset role;
-- Publication is checked for the full academic ancestry, not merely the ID.
update public.academic_boards set is_published=false where id='cbse';
set local role authenticated;
select pg_temp.expect_error($q$select public.discover_test_tutors('cbse-8-mathematics','English')$q$,'22023','unpublished ancestry denied');
reset role;
