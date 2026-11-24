begin;
create type public.test_request_status as enum ('pending','accepted','declined','expired','cancelled');
create table public.test_tutor_requests (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learner_profiles(user_id) on delete restrict,
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete restrict,
  subject_id text not null references public.academic_subjects(id) on delete restrict,
  language public.learning_language not null,
  starts_at timestamptz not null, ends_at timestamptz not null,
  topic text not null default '' check(length(topic)<=120),
  search_id uuid not null, search_started_at timestamptz not null,
  previous_request_id uuid unique references public.test_tutor_requests(id) on delete restrict,
  expires_at timestamptz not null,
  status public.test_request_status not null default 'pending',
  revision integer not null default 1 check(revision>0),
  session_id uuid unique,
  created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
  check(learner_id<>tutor_id),
  check(ends_at-starts_at between interval '15 minutes' and interval '60 minutes'),
  check(extract(second from starts_at)=0 and extract(second from ends_at)=0),
  check(expires_at<=created_at+interval '45 seconds' and expires_at<=search_started_at+interval '90 seconds')
);
create index test_requests_learner_idx on public.test_tutor_requests(learner_id,created_at desc);
create index test_requests_tutor_idx on public.test_tutor_requests(tutor_id,created_at desc);
create index test_requests_search_idx on public.test_tutor_requests(search_id);
create table public.test_booking_intents (
  id uuid primary key, actor_id uuid not null references public.profiles(id) on delete restrict,
  operation text not null check(operation in ('request','request_action','session_action')),
  payload jsonb not null, result_id uuid not null,
  created_at timestamptz not null default clock_timestamp()
);
create table public.test_booking_events (
  id uuid primary key default gen_random_uuid(), event_number bigint generated always as identity unique,
  request_id uuid not null references public.test_tutor_requests(id) on delete restrict,
  session_id uuid,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  intent_id uuid not null references public.test_booking_intents(id) deferrable initially deferred,
  from_status text, to_status text not null,
  note text not null default '' check(length(note)<=400),
  created_at timestamptz not null default clock_timestamp(),
  check ((session_id is null and (
    (from_status is null and to_status='pending') or
    (from_status is not null and from_status='pending' and to_status in ('accepted','declined','cancelled'))
  )) or (session_id is not null and (
    (from_status is null and to_status='scheduled') or
    (from_status is not null and ((from_status='scheduled' and to_status in ('active','cancelled')) or (from_status='active' and to_status in ('completed','cancelled'))))
  )))
);
create index test_booking_events_history_idx on public.test_booking_events(request_id,event_number);
create function private.guard_booking_ownership() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.learner_id<>old.learner_id or new.tutor_id<>old.tutor_id or new.subject_id<>old.subject_id or new.language<>old.language then
    raise exception 'Booking ownership and academic context are immutable' using errcode='23514';
  end if;
  return new;
end $$;
create trigger request_ownership before update on public.test_tutor_requests for each row execute function private.guard_booking_ownership();
create trigger request_revision before update on public.test_tutor_requests for each row execute function private.tutor_revision();
create trigger request_updated before update on public.test_tutor_requests for each row execute function private.touch_updated_at();
do $$ declare t text; begin
  foreach t in array array['test_tutor_requests','test_booking_intents','test_booking_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
    execute format('grant select on public.%I to service_role',t);
    execute format('create policy trusted_service on public.%I to service_role using (true)',t);
  end loop;
end $$;
revoke all on sequence public.test_booking_events_event_number_seq from public,anon,authenticated,service_role;
-- No authenticated table grants: bounded projections below disclose pseudonyms,
-- never another participant's Auth UUID, email or private learning/review data.
create policy own_request on public.test_tutor_requests for select to authenticated
  using((select private.account_session_active()) and (select auth.uid()) in (learner_id,tutor_id));

create function private.booking_text(raw text,maximum integer) returns text language plpgsql immutable security invoker set search_path='' as $$
declare result text:=regexp_replace(trim(coalesce(raw,'')),'[[:cntrl:]<>]','','g'); begin
  if length(result)>maximum or result~* '(https?://|www[.]|@|[0-9][0-9 +()-]{5,}[0-9])' then
    raise exception 'Use a short plain-text learning note without contact information' using errcode='22023';
  end if;
  return result;
end $$;
create function private.begin_booking_intent(req uuid,actor uuid,kind text,body jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare old public.test_booking_intents; begin
  if req is null then raise exception 'Intent identifier required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(req::text,1110));
  perform private.require_test_role(array['learner','tutor']::public.app_role[]);
  select * into old from public.test_booking_intents where id=req;
  if found then
    if old.actor_id<>actor or old.operation<>kind or old.payload<>body then raise exception 'Intent identifier belongs to another operation' using errcode='22023'; end if;
    return old.result_id;
  end if;
  return null;
end $$;
create function private.lock_booking_participants(learner uuid,tutor uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare participant uuid; begin
  -- Deterministic order also handles accounts assigned both learner/tutor roles.
  for participant in select id from public.profiles where id in (learner,tutor) order by id loop
    perform pg_advisory_xact_lock(hashtextextended(participant::text,1111));
  end loop;
  perform 1 from public.tutor_profiles where user_id=tutor for update;
  perform 1 from public.learner_profiles where user_id=learner for update;
  perform 1 from public.adult_test_accounts where user_id in (learner,tutor) order by user_id for share;
  perform 1 from auth.users where id in (learner,tutor) order by id for share;
  perform 1 from public.user_roles where user_id in (learner,tutor) order by user_id,role for share;
  perform 1 from auth.sessions where id::text=auth.jwt()->>'session_id' and user_id=auth.uid() for share;
end $$;
create function private.test_booking_eligible(learner uuid,tutor uuid,subject text,lang public.learning_language,begins timestamptz,ends timestamptz)
returns boolean language sql stable security invoker set search_path='' as $$
  select coalesce(exists(
    select 1 from public.tutor_profiles tp
    join public.academic_subjects s on s.id=subject and s.is_published
    join public.academic_grades g on g.id=s.grade_id and g.is_published
    join public.academic_boards b on b.id=g.board_id and b.is_published
    left join lateral(select status,verified_grade from public.tutor_verification_records where tutor_id=tutor order by event_number desc limit 1) v on true
    where tp.user_id=tutor and learner<>tutor and private.test_target_active(learner,'learner')
      and (private.evaluate_tutor_match(private.test_target_active(tutor,'tutor'),tp.discovery_preview_enabled,v.status,tp.academic_grade,v.verified_grade,
        exists(select 1 from public.tutor_subject_qualifications where tutor_id=tutor and subject_id=subject),
        exists(select 1 from public.tutor_languages where tutor_id=tutor and language=lang),tp.teaching_skill_score,true,g.number)->>'eligible')::boolean
      and (begins at time zone 'Asia/Kolkata')::date=(ends at time zone 'Asia/Kolkata')::date
      and exists(select 1 from public.tutor_availability av where av.tutor_id=tutor and av.enabled
        and av.weekday=extract(dow from begins at time zone 'Asia/Kolkata')
        and av.starts_at<=(begins at time zone 'Asia/Kolkata')::time and av.ends_at>=(ends at time zone 'Asia/Kolkata')::time)
  ),false);
$$;
create function private.effective_request_status(p_row public.test_tutor_requests) returns public.test_request_status
language sql volatile security invoker set search_path='' as $$
  select case when p_row.status='pending' and clock_timestamp()>=p_row.expires_at then 'expired'::public.test_request_status else p_row.status end;
$$;
-- Session migration replaces this helper with reservation checks.
create function private.test_booking_slot_free(learner uuid,tutor uuid,begins timestamptz,ends timestamptz) returns boolean
language sql stable security invoker set search_path='' as $$ select true; $$;

create function public.request_test_tutor(p_intent_id uuid,p_preview_id uuid default null,p_subject_id text default null,
  p_language public.learning_language default null,p_starts_at timestamptz default null,p_duration_minutes smallint default 15,
  p_topic text default '',p_previous_request_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_live_learner(); cached uuid; prior public.test_tutor_requests; tutor uuid; result uuid;
  subject text:=p_subject_id; lang public.learning_language:=p_language; begins timestamptz:=p_starts_at; ends timestamptz;
  topic text; search uuid:=gen_random_uuid(); search_start timestamptz; v_now timestamptz;
  body jsonb:=jsonb_build_array(p_preview_id,p_subject_id,p_language,p_starts_at,p_duration_minutes,p_topic,p_previous_request_id);
begin
  cached:=private.begin_booking_intent(p_intent_id,actor,'request',body); if cached is not null then return cached; end if;
  if p_previous_request_id is not null then
    select * into prior from public.test_tutor_requests where id=p_previous_request_id and learner_id=actor for update;
    if not found then raise exception 'Request unavailable' using errcode='42501'; end if;
    if private.effective_request_status(prior) not in ('declined','expired') or clock_timestamp()>=prior.search_started_at+interval '90 seconds' then
      raise exception 'No fallback remains in this matching window' using errcode='22023';
    end if;
    if exists(select 1 from public.test_tutor_requests where previous_request_id=prior.id) then raise exception 'Fallback already created; refresh' using errcode='40001'; end if;
    subject:=prior.subject_id; lang:=prior.language; begins:=prior.starts_at; ends:=prior.ends_at; topic:=prior.topic;
    search:=prior.search_id; search_start:=prior.search_started_at;
    select tp.user_id into tutor from public.tutor_profiles tp where
      not exists(select 1 from public.test_tutor_requests r where r.search_id=search and r.tutor_id=tp.user_id)
      and private.test_booking_eligible(actor,tp.user_id,subject,lang,begins,ends)
      and private.test_booking_slot_free(actor,tp.user_id,begins,ends)
      order by tp.teaching_skill_score desc,tp.discovery_preview_id limit 1;
  else
    if p_preview_id is null or p_language is null or p_subject_id is null or p_starts_at is null or p_duration_minutes is null
      or p_duration_minutes not between 15 and 60 or p_duration_minutes%15<>0 then raise exception 'Choose a tutor, subject, language and duration of 15–60 minutes' using errcode='22023'; end if;
    select user_id into tutor from public.tutor_profiles where discovery_preview_id=p_preview_id;
    ends:=begins+make_interval(mins=>p_duration_minutes); topic:=private.booking_text(p_topic,120);
  end if;
  if tutor is null or tutor=actor then raise exception 'No currently eligible test tutor is available' using errcode='42501'; end if;
  perform private.lock_booking_participants(actor,tutor);
  perform private.require_live_learner();
  -- Lock publication too; qualification/verification/availability writers share
  -- the tutor profile lock established by Phases 8–10.
  perform 1 from public.academic_boards b join public.academic_grades g on g.board_id=b.id join public.academic_subjects s on s.grade_id=g.id where s.id=subject for share of b,g,s;
  v_now:=clock_timestamp(); search_start:=coalesce(search_start,v_now);
  if (p_previous_request_id is null and begins<v_now+interval '2 minutes') or begins<=v_now or begins>v_now+interval '30 days' or extract(second from begins)<>0 then
    raise exception 'Choose minute precision, 2 minutes to 30 days ahead' using errcode='22023'; end if;
  if v_now>=search_start+interval '90 seconds' then raise exception 'Matching window expired' using errcode='22023'; end if;
  if not private.test_booking_eligible(actor,tutor,subject,lang,begins,ends) then raise exception 'Current test eligibility or saved availability is unavailable' using errcode='42501'; end if;
  if not private.test_booking_slot_free(actor,tutor,begins,ends) then raise exception 'Session interval is already reserved' using errcode='23P01'; end if;
  if (select count(*) from public.test_tutor_requests where learner_id=actor and status='pending' and expires_at>v_now)>=5 then raise exception 'Respond to or cancel existing pending invitations first' using errcode='22023'; end if;
  insert into public.test_tutor_requests(learner_id,tutor_id,subject_id,language,starts_at,ends_at,topic,search_id,search_started_at,previous_request_id,expires_at,created_at)
    values(actor,tutor,subject,lang,begins,ends,topic,search,search_start,p_previous_request_id,least(v_now+interval '45 seconds',search_start+interval '90 seconds'),v_now) returning id into result;
  insert into public.test_booking_intents(id,actor_id,operation,payload,result_id) values(p_intent_id,actor,'request',body,result);
  insert into public.test_booking_events(request_id,actor_id,intent_id,to_status,note) values(result,actor,p_intent_id,'pending','Adult-test invitation created; response deadline is server-owned.');
  return result;
end $$;
revoke all on function private.guard_booking_ownership(),private.booking_text(text,integer),private.begin_booking_intent(uuid,uuid,text,jsonb),
  private.lock_booking_participants(uuid,uuid),private.test_booking_eligible(uuid,uuid,text,public.learning_language,timestamptz,timestamptz),
  private.effective_request_status(public.test_tutor_requests),private.test_booking_slot_free(uuid,uuid,timestamptz,timestamptz) from public,anon,authenticated,service_role;
revoke all on function public.request_test_tutor(uuid,uuid,text,public.learning_language,timestamptz,smallint,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.request_test_tutor(uuid,uuid,text,public.learning_language,timestamptz,smallint,text,uuid) to authenticated;
commit;
