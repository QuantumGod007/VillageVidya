begin;
create type public.test_safety_status as enum ('submitted','under_review','resolved','closed');
create table public.tutor_test_evidence (
  id uuid primary key default gen_random_uuid(), event_number bigint generated always as identity unique,
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete restrict,
  prepared_by uuid not null references public.profiles(id) on delete restrict,
  label text not null default 'synthetic_classroom' check(label='synthetic_classroom'),
  note text not null check(length(trim(note)) between 10 and 500),
  created_at timestamptz not null default now(), check(prepared_by<>tutor_id)
);
create index tutor_test_evidence_latest_idx on public.tutor_test_evidence(tutor_id,event_number desc);
create table public.test_trust_audit (
  id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  operation text not null check(operation in ('tutor_review','relationship_review','consent','safety_review')),
  subject_id uuid not null, request_payload jsonb not null, result_id uuid not null,
  reason text not null check(length(trim(reason)) between 10 and 400),
  created_at timestamptz not null default now()
);
create index test_trust_audit_actor_idx on public.test_trust_audit(actor_id,created_at desc);
create table public.test_safety_reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id) on delete restrict,
  submission_id uuid not null, category text not null check(category in ('conduct','content','access','other')),
  summary text not null check(length(trim(summary)) between 10 and 800),
  status public.test_safety_status not null default 'submitted', revision integer not null default 1 check(revision>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(reporter_id,submission_id)
);
create index test_safety_reports_queue_idx on public.test_safety_reports(status,created_at desc);
create table public.test_safety_actions (
  id uuid primary key default gen_random_uuid(), event_number bigint generated always as identity unique,
  report_id uuid not null references public.test_safety_reports(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  from_status public.test_safety_status, to_status public.test_safety_status not null,
  action_note text not null check(length(trim(action_note)) between 10 and 500),
  created_at timestamptz not null default now(),
  check ((from_status is null and to_status='submitted') or (from_status='submitted' and to_status='under_review') or (from_status='under_review' and to_status in ('resolved','closed')))
);
create index test_safety_actions_history_idx on public.test_safety_actions(report_id,event_number desc);
alter table public.guardian_relationships add column revision integer not null default 1 check(revision>0);
create trigger relationship_revision before update on public.guardian_relationships for each row execute function private.tutor_revision();
create trigger safety_revision before update on public.test_safety_reports for each row execute function private.tutor_revision();
create trigger safety_updated before update on public.test_safety_reports for each row execute function private.touch_updated_at();
do $$ declare t text; begin
  foreach t in array array['tutor_test_evidence','test_trust_audit','test_safety_reports','test_safety_actions'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
    execute format('grant select on public.%I to service_role',t);
    execute format('create policy trusted_service on public.%I to service_role using (true) with check (true)',t);
  end loop;
end $$;
grant insert on public.tutor_test_evidence to service_role;
grant usage,select on sequence public.tutor_test_evidence_event_number_seq,public.test_safety_actions_event_number_seq to service_role;
revoke all on sequence public.tutor_test_evidence_event_number_seq,public.test_safety_actions_event_number_seq from public,anon,authenticated;
grant select on public.test_safety_reports to authenticated;
create policy own_test_report on public.test_safety_reports for select to authenticated using(reporter_id=(select auth.uid()));
create policy live_adult_account on public.test_safety_reports as restrictive to authenticated using((select private.account_session_active()));

create function private.require_test_role(allowed public.app_role[]) returns uuid
language plpgsql security invoker set search_path='' as $$
declare caller uuid:=auth.uid(); begin
  if caller is null or not private.account_session_active() or not exists(
    select 1 from public.user_roles where user_id=caller and role=any(allowed)) then
    raise exception 'Active adult test account with permitted role required' using errcode='42501';
  end if; return caller;
end $$;
create function private.test_target_active(target uuid,required public.app_role) returns boolean
language sql stable security invoker set search_path='' as $$
  select exists(select 1 from public.adult_test_accounts a join auth.users u on u.id=a.user_id
    join public.user_roles r on r.user_id=a.user_id and r.role=required
    where a.user_id=target and a.enabled and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=now()));
$$;
create function private.begin_test_operation(req uuid,actor uuid,kind text,payload jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare old public.test_trust_audit; begin
  if req is null then raise exception 'Request identifier required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(req::text,1010));
  select * into old from public.test_trust_audit where request_id=req;
  if found then
    if old.actor_id<>actor or old.operation<>kind or old.request_payload<>payload then
      raise exception 'Request identifier was already used for another intent' using errcode='22023';
    end if; return old.id;
  end if; return null;
end $$;
-- Qualification/evidence/verification mutations share the profile lock with
-- review decisions, without changing Phase 8 biography revision semantics.
create function private.lock_tutor_trust() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.tutor_profiles where user_id=case when tg_op='DELETE' then old.tutor_id else new.tutor_id end for update;
  if tg_op='UPDATE' and old.tutor_id<>new.tutor_id then perform 1 from public.tutor_profiles where user_id=old.tutor_id for update; end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
create trigger qualification_review_lock before insert or update or delete on public.tutor_subject_qualifications for each row execute function private.lock_tutor_trust();
create trigger language_review_lock before insert or update or delete on public.tutor_languages for each row execute function private.lock_tutor_trust();
create trigger evidence_review_lock before insert on public.tutor_test_evidence for each row execute function private.lock_tutor_trust();
create trigger verification_review_lock before insert on public.tutor_verification_records for each row execute function private.lock_tutor_trust();
create function private.tutor_review_token(target uuid) returns text language sql stable security invoker set search_path='' as $$
  select md5(jsonb_build_array(tp.revision,tp.academic_grade,a.enabled,u.email_confirmed_at,u.banned_until,
    (select coalesce(jsonb_agg(jsonb_build_array(q.subject_id,q.updated_at) order by q.subject_id),'[]') from public.tutor_subject_qualifications q where q.tutor_id=target),
    (select coalesce(jsonb_agg(jsonb_build_array(l.language,l.updated_at) order by l.language),'[]') from public.tutor_languages l where l.tutor_id=target),
    (select max(e.event_number) from public.tutor_test_evidence e where e.tutor_id=target),
    (select max(v.event_number) from public.tutor_verification_records v where v.tutor_id=target)
  )::text) from public.tutor_profiles tp join public.adult_test_accounts a on a.user_id=tp.user_id join auth.users u on u.id=tp.user_id where tp.user_id=target;
$$;
revoke all on function private.require_test_role(public.app_role[]),private.test_target_active(uuid,public.app_role),private.begin_test_operation(uuid,uuid,text,jsonb),private.lock_tutor_trust(),private.tutor_review_token(uuid) from public,anon,authenticated,service_role;

create function public.review_test_tutor(p_tutor_id uuid,p_token text,p_status public.review_status,p_grade smallint,p_reason text,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_test_role(array['champion','admin']::public.app_role[]); cached uuid; grade smallint; latest public.review_status; event_id uuid; audit_id uuid;
  payload jsonb:=jsonb_build_array(p_tutor_id,p_token,p_status,p_grade,trim(p_reason));
begin
  if p_tutor_id=actor then raise exception 'Self review is not permitted' using errcode='42501'; end if;
  if p_reason is null or length(trim(p_reason)) not between 10 and 400 then raise exception 'A decision reason of 10–400 characters is required' using errcode='22023'; end if;
  cached:=private.begin_test_operation(p_request_id,actor,'tutor_review',payload); if cached is not null then return cached; end if;
  select academic_grade into grade from public.tutor_profiles where user_id=p_tutor_id for update;
  if not found or not exists(select 1 from public.adult_test_accounts where user_id=p_tutor_id) or (p_status is distinct from 'revoked' and not private.test_target_active(p_tutor_id,'tutor')) then raise exception 'Adult test tutor unavailable' using errcode='42501'; end if;
  if p_token is distinct from private.tutor_review_token(p_tutor_id) then raise exception 'Review evidence changed. Refresh before deciding' using errcode='40001'; end if;
  select status into latest from public.tutor_verification_records where tutor_id=p_tutor_id order by event_number desc limit 1;
  if p_status is null or p_status='pending' or (p_status='revoked' and latest is distinct from 'approved')
    or (p_status='approved' and latest='approved') or (p_status='rejected' and latest in ('approved','rejected')) then
    raise exception 'Invalid test verification transition' using errcode='22023';
  end if;
  if p_status='approved' then
    if p_grade is null or p_grade not between 4 and grade
      or not exists(select 1 from public.tutor_test_evidence where tutor_id=p_tutor_id)
      or not exists(select 1 from public.tutor_subject_qualifications where tutor_id=p_tutor_id)
      or not exists(select 1 from public.tutor_languages where tutor_id=p_tutor_id) then
      raise exception 'Synthetic test evidence, trusted subjects/languages and a permitted grade are required' using errcode='22023';
    end if;
  elsif p_grade is not null then raise exception 'Only an approval records a grade' using errcode='22023'; end if;
  insert into public.tutor_verification_records(tutor_id,status,reviewed_by,verified_grade,decision_note)
    values(p_tutor_id,p_status,actor,p_grade,'ADULT TEST ONLY: '||trim(p_reason)) returning id into event_id;
  insert into public.test_trust_audit(request_id,actor_id,operation,subject_id,request_payload,result_id,reason)
    values(p_request_id,actor,'tutor_review',p_tutor_id,payload,event_id,trim(p_reason)) returning id into audit_id;
  return audit_id;
end $$;

create function public.review_test_relationship(p_guardian_id uuid,p_learner_id uuid,p_revision integer,p_status public.review_status,p_reason text,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_test_role(array['admin']::public.app_role[]); cached uuid; rel public.guardian_relationships; event_id uuid; audit_id uuid;
  payload jsonb:=jsonb_build_array(p_guardian_id,p_learner_id,p_revision,p_status,trim(p_reason));
begin
  if actor in (p_guardian_id,p_learner_id) or p_guardian_id=p_learner_id then raise exception 'Independent relationship administration required' using errcode='42501'; end if;
  if p_reason is null or length(trim(p_reason)) not between 10 and 400 or p_status is null or p_status not in ('approved','revoked') then raise exception 'Choose a test-link action and a reason of 10–400 characters' using errcode='22023'; end if;
  cached:=private.begin_test_operation(p_request_id,actor,'relationship_review',payload); if cached is not null then return cached; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_guardian_id::text||p_learner_id::text,1011));
  if not exists(select 1 from public.adult_test_accounts where user_id=p_guardian_id) or not exists(select 1 from public.adult_test_accounts where user_id=p_learner_id) or (p_status='approved' and (not private.test_target_active(p_guardian_id,'guardian') or not private.test_target_active(p_learner_id,'learner'))) then raise exception 'Active adult test participants required' using errcode='42501'; end if;
  select * into rel from public.guardian_relationships where guardian_id=p_guardian_id and learner_id=p_learner_id for update;
  if coalesce(rel.revision,0) is distinct from p_revision then raise exception 'Relationship changed. Refresh before deciding' using errcode='40001'; end if;
  if (rel.id is null and p_status<>'approved') or rel.status=p_status then raise exception 'Invalid relationship transition' using errcode='22023'; end if;
  if rel.id is null then
    insert into public.guardian_relationships(guardian_id,learner_id,status,reviewed_by,reviewed_at) values(p_guardian_id,p_learner_id,p_status,actor,clock_timestamp()) returning * into rel;
  else
    update public.guardian_relationships set status=p_status,reviewed_by=actor,reviewed_at=clock_timestamp() where id=rel.id returning * into rel;
  end if;
  -- A new/re-established link always requires fresh guardian consent.
  insert into public.guardian_consent_records(relationship_id,status,recorded_by,policy_version,decision_note)
    values(rel.id,case when p_status='approved' then 'pending'::public.review_status else 'revoked'::public.review_status end,actor,'adult-test-v1','ADULT TEST link decision: '||trim(p_reason)) returning id into event_id;
  insert into public.test_trust_audit(request_id,actor_id,operation,subject_id,request_payload,result_id,reason)
    values(p_request_id,actor,'relationship_review',rel.id,payload,event_id,trim(p_reason)) returning id into audit_id;
  return audit_id;
end $$;
create function public.record_test_consent(p_relationship_id uuid,p_expected_event bigint,p_grant boolean,p_reason text,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_test_role(array['guardian']::public.app_role[]); rel public.guardian_relationships; latest public.guardian_consent_records; cached uuid; event_id uuid; audit_id uuid;
  payload jsonb:=jsonb_build_array(p_relationship_id,p_expected_event,p_grant,trim(p_reason));
begin
  if p_grant is null or p_reason is null or length(trim(p_reason)) not between 10 and 400 then raise exception 'Explicit consent choice and reason required' using errcode='22023'; end if;
  cached:=private.begin_test_operation(p_request_id,actor,'consent',payload); if cached is not null then return cached; end if;
  select * into rel from public.guardian_relationships where id=p_relationship_id and guardian_id=actor for update;
  if not found or rel.status<>'approved' or (p_grant and not private.test_target_active(rel.learner_id,'learner')) then raise exception 'Approved adult test relationship required' using errcode='42501'; end if;
  select * into latest from public.guardian_consent_records where relationship_id=rel.id order by event_number desc limit 1;
  if coalesce(latest.event_number,0) is distinct from p_expected_event then raise exception 'Consent changed. Refresh before deciding' using errcode='40001'; end if;
  if (p_grant and latest.status='approved') or (not p_grant and latest.status is distinct from 'approved') then raise exception 'Invalid test consent transition' using errcode='22023'; end if;
  insert into public.guardian_consent_records(relationship_id,status,recorded_by,policy_version,decision_note)
    values(rel.id,case when p_grant then 'approved'::public.review_status else 'revoked'::public.review_status end,actor,'adult-test-v1','ADULT TEST consent: '||trim(p_reason)) returning id into event_id;
  insert into public.test_trust_audit(request_id,actor_id,operation,subject_id,request_payload,result_id,reason)
    values(p_request_id,actor,'consent',rel.id,payload,event_id,trim(p_reason)) returning id into audit_id;
  return audit_id;
end $$;
-- Fix the cross-account read gate: both participants must remain active test
-- accounts and the caller must still hold the guardian role. No cached consent.
create or replace function private.can_read_learner(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select private.account_session_active() and (target=auth.uid() or (
    exists(select 1 from public.user_roles where user_id=auth.uid() and role='guardian')
    and private.test_target_active(target,'learner') and exists(
      select 1 from public.guardian_relationships r where r.learner_id=target and r.guardian_id=auth.uid() and r.status='approved'
      and (select c.status from public.guardian_consent_records c where c.relationship_id=r.id order by c.event_number desc limit 1)='approved'
    )));
$$;

create function public.submit_test_safety_report(p_submission_id uuid,p_category text,p_summary text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_test_role(array['learner','tutor','guardian','champion','admin']::public.app_role[]); old public.test_safety_reports; result uuid;
begin
  if p_submission_id is null or p_category is null or p_category not in ('conduct','content','access','other') or p_summary is null or length(trim(p_summary)) not between 10 and 800 then raise exception 'Choose a category and a synthetic test summary of 10–800 characters' using errcode='22023'; end if;
  perform 1 from public.profiles where id=actor for update;
  select * into old from public.test_safety_reports where reporter_id=actor and submission_id=p_submission_id;
  if found then
    if old.category<>p_category or old.summary<>trim(p_summary) then raise exception 'Submission identifier already used for another report' using errcode='22023'; end if;
    return old.id;
  end if;
  insert into public.test_safety_reports(reporter_id,submission_id,category,summary) values(actor,p_submission_id,p_category,trim(p_summary)) returning id into result;
  insert into public.test_safety_actions(report_id,actor_id,to_status,action_note) values(result,actor,'submitted','Adult-test safety report submitted.');
  return result;
end $$;
create function public.review_test_safety_report(p_report_id uuid,p_revision integer,p_status public.test_safety_status,p_note text,p_request_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_test_role(array['champion','admin']::public.app_role[]); report public.test_safety_reports; cached uuid; event_id uuid; audit_id uuid;
  payload jsonb:=jsonb_build_array(p_report_id,p_revision,p_status,trim(p_note));
begin
  if p_note is null or length(trim(p_note)) not between 10 and 400 then raise exception 'Review action note of 10–400 characters required' using errcode='22023'; end if;
  cached:=private.begin_test_operation(p_request_id,actor,'safety_review',payload); if cached is not null then return cached; end if;
  select * into report from public.test_safety_reports where id=p_report_id for update;
  if not found or report.reporter_id=actor then raise exception 'Independent safety review required' using errcode='42501'; end if;
  if report.revision is distinct from p_revision then raise exception 'Report changed. Refresh before deciding' using errcode='40001'; end if;
  if p_status is null or not ((report.status='submitted' and p_status='under_review') or (report.status='under_review' and p_status in ('resolved','closed'))) then raise exception 'Invalid safety report transition' using errcode='22023'; end if;
  update public.test_safety_reports set status=p_status where id=report.id;
  insert into public.test_safety_actions(report_id,actor_id,from_status,to_status,action_note) values(report.id,actor,report.status,p_status,trim(p_note)) returning id into event_id;
  insert into public.test_trust_audit(request_id,actor_id,operation,subject_id,request_payload,result_id,reason)
    values(p_request_id,actor,'safety_review',report.id,payload,event_id,trim(p_note)) returning id into audit_id;
  return audit_id;
end $$;
revoke all on function public.review_test_tutor(uuid,text,public.review_status,smallint,text,uuid),public.review_test_relationship(uuid,uuid,integer,public.review_status,text,uuid),public.record_test_consent(uuid,bigint,boolean,text,uuid),public.submit_test_safety_report(uuid,text,text),public.review_test_safety_report(uuid,integer,public.test_safety_status,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.review_test_tutor(uuid,text,public.review_status,smallint,text,uuid),public.review_test_relationship(uuid,uuid,integer,public.review_status,text,uuid),public.record_test_consent(uuid,bigint,boolean,text,uuid),public.submit_test_safety_report(uuid,text,text),public.review_test_safety_report(uuid,integer,public.test_safety_status,text,uuid) to authenticated;
commit;
