-- Fictional test identities only, rolled back after each suite. No credentials,
-- signed-in real users, approved consent or physical verification are seeded.
insert into auth.users(id,email,aud,role,raw_app_meta_data,raw_user_meta_data,email_confirmed_at)
select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
  'vv-test-'||n||'@example.invalid','authenticated','authenticated','{}','{}',now()
from generate_series(1,8) n;
insert into public.profiles(id,display_name) select id,'Fictional test '||right(email,18) from auth.users where email like 'vv-test-%@example.invalid';
insert into public.user_roles(user_id,role) values
 ('00000000-0000-0000-0000-000000000001','learner'),('00000000-0000-0000-0000-000000000002','learner'),
 ('00000000-0000-0000-0000-000000000003','tutor'),('00000000-0000-0000-0000-000000000004','guardian'),
 ('00000000-0000-0000-0000-000000000005','champion'),('00000000-0000-0000-0000-000000000006','admin'),
 ('00000000-0000-0000-0000-000000000007','guardian'),('00000000-0000-0000-0000-000000000008','tutor');
insert into public.learner_profiles(user_id) values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into public.tutor_profiles(user_id,academic_grade,teaching_skill_score) values
 ('00000000-0000-0000-0000-000000000003',11,70),('00000000-0000-0000-0000-000000000008',12,null);
insert into public.guardian_relationships(id,guardian_id,learner_id) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001');
insert into public.guardian_consent_records(relationship_id,status,recorded_by,policy_version,decision_note) values
 ('10000000-0000-0000-0000-000000000001','pending','00000000-0000-0000-0000-000000000004','fixture-v1','Fictional pending test record. No real consent.');
insert into public.lesson_progress(learner_id,lesson_id,checkpoint_percent) values
 ('00000000-0000-0000-0000-000000000001','equations',25),('00000000-0000-0000-0000-000000000002','fractions',50);
insert into public.learner_bookmarks(learner_id,lesson_id) values
 ('00000000-0000-0000-0000-000000000001','equations'),('00000000-0000-0000-0000-000000000002','fractions');
insert into public.assessment_attempts(learner_id,assessment_id,lesson_id,selected_option,score_percent) values
 ('00000000-0000-0000-0000-000000000001','equations-checkpoint','equations',0,100),
 ('00000000-0000-0000-0000-000000000002','fractions-checkpoint','fractions',1,100);
insert into public.tutor_subject_qualifications(tutor_id,subject_id) values ('00000000-0000-0000-0000-000000000003','cbse-8-mathematics');
insert into public.tutor_languages(tutor_id,language) values ('00000000-0000-0000-0000-000000000003','English');
insert into public.tutor_availability(tutor_id,weekday,starts_at,ends_at) values ('00000000-0000-0000-0000-000000000003',1,'16:00','17:00');

insert into public.adult_test_accounts(user_id,enabled) select id,true from public.profiles;
insert into auth.sessions(id,user_id) select id,id from public.profiles;

-- Invoker-only test assertions: queries execute as the actual SET ROLE caller.
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql security invoker as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create function pg_temp.expect_error(command text, expected_state text, label text) returns void language plpgsql security invoker as $$
begin
  begin execute command;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise exception 'FAIL: % (expected %, got %: %)',label,expected_state,sqlstate,sqlerrm;
  end;
  raise exception 'FAIL: % (command unexpectedly succeeded)',label;
end $$;
