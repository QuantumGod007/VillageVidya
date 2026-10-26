begin;
set local search_path=public,extensions;
create type public.test_session_status as enum ('scheduled','active','completed','cancelled','missed');
create table public.test_scheduled_sessions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.test_tutor_requests(id) on delete restrict,
  learner_id uuid not null references public.learner_profiles(user_id) on delete restrict,
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete restrict,
  subject_id text not null references public.academic_subjects(id) on delete restrict,
  language public.learning_language not null,
  starts_at timestamptz not null, ends_at timestamptz not null,
  status public.test_session_status not null default 'scheduled',
  revision integer not null default 1 check(revision>0),
  started_at timestamptz, completed_at timestamptz, cancelled_at timestamptz,
  summary text not null default '' check(length(summary)<=400),
  created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
  check(learner_id<>tutor_id),
  check(ends_at-starts_at between interval '15 minutes' and interval '60 minutes'),
  check(extract(second from starts_at)=0 and extract(second from ends_at)=0),
  exclude using gist(tutor_id with =,tstzrange(starts_at,ends_at,'[)') with &&) where(status in ('scheduled','active')),
  exclude using gist(learner_id with =,tstzrange(starts_at,ends_at,'[)') with &&) where(status in ('scheduled','active'))
);
create index test_sessions_learner_idx on public.test_scheduled_sessions(learner_id,created_at desc);
create index test_sessions_tutor_idx on public.test_scheduled_sessions(tutor_id,created_at desc);
alter table public.test_tutor_requests add foreign key(session_id) references public.test_scheduled_sessions(id) on delete restrict deferrable initially deferred;
alter table public.test_booking_events add foreign key(session_id) references public.test_scheduled_sessions(id) on delete restrict;
create trigger session_ownership before update on public.test_scheduled_sessions for each row execute function private.guard_booking_ownership();
create trigger session_revision before update on public.test_scheduled_sessions for each row execute function private.tutor_revision();
create trigger session_updated before update on public.test_scheduled_sessions for each row execute function private.touch_updated_at();
alter table public.test_scheduled_sessions enable row level security;
alter table public.test_scheduled_sessions force row level security;
revoke all on public.test_scheduled_sessions from public,anon,authenticated,service_role;
grant select on public.test_scheduled_sessions to service_role;
create policy trusted_service on public.test_scheduled_sessions to service_role using(true);
create policy own_session on public.test_scheduled_sessions for select to authenticated using((select private.account_session_active()) and (select auth.uid()) in(learner_id,tutor_id));
create or replace function private.test_booking_slot_free(learner uuid,tutor uuid,begins timestamptz,ends timestamptz) returns boolean
language sql stable security invoker set search_path='' as $$
  select not exists(select 1 from public.test_scheduled_sessions s where (s.tutor_id in(learner,tutor) or s.learner_id in(learner,tutor))
    and s.status in ('scheduled','active') and tstzrange(s.starts_at,s.ends_at,'[)')&&tstzrange(begins,ends,'[)'));
$$;
create function private.effective_session_status(p_row public.test_scheduled_sessions) returns public.test_session_status
language sql volatile security invoker set search_path='' as $$
  select case when (p_row.status='scheduled' and clock_timestamp()>=p_row.ends_at)
    or (p_row.status='active' and clock_timestamp()>=p_row.ends_at+interval '15 minutes') then 'missed'::public.test_session_status else p_row.status end;
$$;
create function public.respond_test_request(p_request_id uuid,p_revision integer,p_action text,p_intent_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_test_role(array['learner','tutor']::public.app_role[]); req public.test_tutor_requests; cached uuid; session uuid;
  body jsonb:=jsonb_build_array(p_request_id,p_revision,p_action); target public.test_request_status;
begin
  cached:=private.begin_booking_intent(p_intent_id,actor,'request_action',body); if cached is not null then return cached; end if;
  select * into req from public.test_tutor_requests where id=p_request_id and actor in(learner_id,tutor_id) for update;
  if not found then raise exception 'Request unavailable' using errcode='42501'; end if;
  perform private.require_test_role(array['learner','tutor']::public.app_role[]);
  if p_action is null or p_action not in('accept','decline','cancel') then raise exception 'Choose a permitted request action' using errcode='22023'; end if;
  if (p_action in('accept','decline') and (actor<>req.tutor_id or not exists(select 1 from public.user_roles where user_id=actor and role='tutor')))
    or (p_action='cancel' and (actor<>req.learner_id or not exists(select 1 from public.user_roles where user_id=actor and role='learner'))) then
    raise exception 'This participant cannot perform that action' using errcode='42501'; end if;
  if req.revision is distinct from p_revision then raise exception 'Request changed; refresh before responding' using errcode='40001'; end if;
  if private.effective_request_status(req)<>'pending' then raise exception 'Invitation is no longer pending' using errcode='22023'; end if;
  if p_action='accept' then
    perform private.lock_booking_participants(req.learner_id,req.tutor_id);
    perform private.require_test_role(array['tutor']::public.app_role[]);
    perform 1 from public.academic_boards b join public.academic_grades g on g.board_id=b.id join public.academic_subjects s on s.grade_id=g.id where s.id=req.subject_id for share of b,g,s;
    -- Recheck the clock and evidence AFTER all contention waits.
    if clock_timestamp()>=req.expires_at or clock_timestamp()>=req.starts_at then raise exception 'Invitation expired' using errcode='22023'; end if;
    if not private.test_booking_eligible(req.learner_id,req.tutor_id,req.subject_id,req.language,req.starts_at,req.ends_at) then raise exception 'Current adult-test eligibility or availability was revoked' using errcode='42501'; end if;
    if not private.test_booking_slot_free(req.learner_id,req.tutor_id,req.starts_at,req.ends_at) then raise exception 'Participant interval already reserved' using errcode='23P01'; end if;
    insert into public.test_scheduled_sessions(request_id,learner_id,tutor_id,subject_id,language,starts_at,ends_at)
      values(req.id,req.learner_id,req.tutor_id,req.subject_id,req.language,req.starts_at,req.ends_at) returning id into session;
    target:='accepted';
  else target:=case when p_action='decline' then 'declined'::public.test_request_status else 'cancelled'::public.test_request_status end;
  end if;
  update public.test_tutor_requests set status=target,session_id=session where id=req.id;
  insert into public.test_booking_intents(id,actor_id,operation,payload,result_id) values(p_intent_id,actor,'request_action',body,coalesce(session,req.id));
  insert into public.test_booking_events(request_id,actor_id,intent_id,from_status,to_status,note) values(req.id,actor,p_intent_id,'pending',target::text,'Adult-test invitation response.');
  if session is not null then
    insert into public.test_booking_events(request_id,session_id,actor_id,intent_id,to_status,note) values(req.id,session,actor,p_intent_id,'scheduled','Agreed interval atomically reserved. No tutoring transport is connected.');
  end if;
  return coalesce(session,req.id);
end $$;
create function public.transition_test_session(p_session_id uuid,p_revision integer,p_action text,p_note text,p_intent_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_test_role(array['learner','tutor']::public.app_role[]); s public.test_scheduled_sessions; cached uuid; target public.test_session_status; note text;
  body jsonb:=jsonb_build_array(p_session_id,p_revision,p_action,p_note);
begin
  cached:=private.begin_booking_intent(p_intent_id,actor,'session_action',body); if cached is not null then return cached; end if;
  select * into s from public.test_scheduled_sessions where id=p_session_id and actor in(learner_id,tutor_id) for update;
  if not found then raise exception 'Session unavailable' using errcode='42501'; end if;
  perform private.require_test_role(array['learner','tutor']::public.app_role[]);
  if not exists(select 1 from public.user_roles where user_id=actor and role=case when actor=s.learner_id then 'learner'::public.app_role else 'tutor'::public.app_role end) then raise exception 'Participant role unavailable' using errcode='42501'; end if;
  if s.revision is distinct from p_revision then raise exception 'Session changed; refresh before deciding' using errcode='40001'; end if;
  if p_action is null or p_action not in('start','complete','cancel') or private.effective_session_status(s) not in('scheduled','active') then raise exception 'Session action unavailable' using errcode='22023'; end if;
  note:=private.booking_text(p_note,400);
  if p_action='start' then
    if s.status<>'scheduled' or clock_timestamp()<s.starts_at or clock_timestamp()>=s.ends_at then raise exception 'Start is allowed only during the scheduled interval' using errcode='22023'; end if;
    perform private.lock_booking_participants(s.learner_id,s.tutor_id);
    perform private.require_test_role(array['learner','tutor']::public.app_role[]);
    if clock_timestamp()>=s.ends_at then raise exception 'Start window expired while waiting' using errcode='22023'; end if;
    if not exists(select 1 from public.test_tutor_requests r where r.id=s.request_id and private.test_booking_eligible(s.learner_id,s.tutor_id,s.subject_id,s.language,r.starts_at,r.ends_at)) then raise exception 'Current test eligibility unavailable; cancel the session' using errcode='42501'; end if;
    target:='active';
  elsif p_action='complete' then
    if s.status<>'active' then raise exception 'Start the session before completing it' using errcode='22023'; end if;
    target:='completed';
  else target:='cancelled';
  end if;
  update public.test_scheduled_sessions set status=target,started_at=case when target='active' then clock_timestamp() else started_at end,
    completed_at=case when target='completed' then clock_timestamp() else completed_at end,
    cancelled_at=case when target='cancelled' then clock_timestamp() else cancelled_at end,
    summary=case when target='completed' then note else summary end where id=s.id;
  insert into public.test_booking_intents(id,actor_id,operation,payload,result_id) values(p_intent_id,actor,'session_action',body,s.id);
  insert into public.test_booking_events(request_id,session_id,actor_id,intent_id,from_status,to_status,note) values(s.request_id,s.id,actor,p_intent_id,s.status::text,target::text,note);
  return s.id;
end $$;

create function public.load_test_bookings(p_record_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_test_role(array['learner','tutor']::public.app_role[]); requests jsonb; sessions jsonb; v_now timestamptz:=clock_timestamp(); begin
  if p_record_id is not null and not exists(select 1 from public.test_tutor_requests r where actor in(r.learner_id,r.tutor_id) and (r.id=p_record_id or r.session_id=p_record_id)) then raise exception 'Booking unavailable' using errcode='42501'; end if;
  select coalesce(jsonb_agg(item),'[]') into requests from (
    select jsonb_build_object('id',r.id,'viewer_role',case when actor=r.learner_id then 'learner' else 'tutor' end,
      'tutor_label','Test tutor '||left(tp.discovery_preview_id::text,8),'learner_label','Adult learner '||left(r.learner_id::text,8),
      'subject_id',r.subject_id,'subject',sub.name,'language',r.language,'starts_at',r.starts_at,'ends_at',r.ends_at,'topic',r.topic,
      'created_at',r.created_at,'updated_at',r.updated_at,'expires_at',r.expires_at,'search_expires_at',r.search_started_at+interval '90 seconds',
      'status',case when r.status='pending' and v_now>=r.expires_at then 'expired'::public.test_request_status else r.status end,'revision',r.revision,'session_id',r.session_id,
      'can_fallback',actor=r.learner_id and (r.status in('expired','declined') or (r.status='pending' and v_now>=r.expires_at)) and v_now<r.search_started_at+interval '90 seconds'
        and not exists(select 1 from public.test_tutor_requests child where child.previous_request_id=r.id)
    ) item from public.test_tutor_requests r join public.tutor_profiles tp on tp.user_id=r.tutor_id join public.academic_subjects sub on sub.id=r.subject_id
    where actor in(r.learner_id,r.tutor_id) and (p_record_id is null or r.id=p_record_id or r.session_id=p_record_id) order by r.created_at desc,r.id limit 51
  ) q;
  select coalesce(jsonb_agg(item),'[]') into sessions from (
    select jsonb_build_object('id',s.id,'request_id',s.request_id,'viewer_role',case when actor=s.learner_id then 'learner' else 'tutor' end,
      'tutor_label','Test tutor '||left(tp.discovery_preview_id::text,8),'learner_label','Adult learner '||left(s.learner_id::text,8),
      'subject_id',s.subject_id,'subject',sub.name,'language',s.language,'starts_at',s.starts_at,'ends_at',s.ends_at,
      'status',case when (s.status='scheduled' and v_now>=s.ends_at) or (s.status='active' and v_now>=s.ends_at+interval '15 minutes') then 'missed'::public.test_session_status else s.status end,'revision',s.revision,'started_at',s.started_at,'completed_at',s.completed_at,'cancelled_at',s.cancelled_at,'summary',s.summary,
      'history',coalesce((select jsonb_agg(jsonb_build_object('event_number',e.event_number,'status',e.to_status,'actor_role',case when e.actor_id=s.learner_id then 'learner' else 'tutor' end,'created_at',e.created_at,'note',e.note) order by e.event_number)
        from public.test_booking_events e where e.session_id=s.id),'[]')
    ) item from public.test_scheduled_sessions s join public.tutor_profiles tp on tp.user_id=s.tutor_id join public.academic_subjects sub on sub.id=s.subject_id
    where actor in(s.learner_id,s.tutor_id) and (p_record_id is null or s.id=p_record_id or s.request_id=p_record_id) order by s.created_at desc,s.id limit 51
  ) q;
  return jsonb_build_object('test_only',true,'as_of',v_now,'requests',private.trust_bound_rows(requests),'sessions',private.trust_bound_rows(sessions),
    'more',jsonb_array_length(requests)>50 or jsonb_array_length(sessions)>50);
end $$;
revoke all on function private.effective_session_status(public.test_scheduled_sessions) from public,anon,authenticated,service_role;
revoke all on function public.respond_test_request(uuid,integer,text,uuid),public.transition_test_session(uuid,integer,text,text,uuid),public.load_test_bookings(uuid) from public,anon,authenticated,service_role;
grant execute on function public.respond_test_request(uuid,integer,text,uuid),public.transition_test_session(uuid,integer,text,text,uuid),public.load_test_bookings(uuid) to authenticated;
commit;
