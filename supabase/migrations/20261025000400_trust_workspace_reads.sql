begin;
create function private.trust_bound_rows(rows jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
  select coalesce(jsonb_agg(value order by ord) filter(where ord<=50),'[]'::jsonb) from jsonb_array_elements(rows) with ordinality x(value,ord);
$$;
create function public.load_test_trust_workspace(p_query text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_test_role(array['learner','tutor','guardian','champion','admin']::public.app_role[]);
  staff boolean; administrator boolean; is_guardian boolean; is_learner boolean;
  tutors jsonb:='[]'; links jsonb:='[]'; reports jsonb; safety jsonb:='[]'; accounts jsonb:='[]'; actions jsonb:='[]';
begin
  if p_query is null or length(p_query)>64 then raise exception 'Use an ID search of at most 64 characters' using errcode='22023'; end if;
  select exists(select 1 from public.user_roles where user_id=actor and role in ('champion','admin')),
    exists(select 1 from public.user_roles where user_id=actor and role='admin'),
    exists(select 1 from public.user_roles where user_id=actor and role='guardian'),
    exists(select 1 from public.user_roles where user_id=actor and role='learner') into staff,administrator,is_guardian,is_learner;
  if staff then
    select coalesce(jsonb_agg(item),'[]') into tutors from (
      select jsonb_build_object('tutor_id',tp.user_id,'label','Test tutor '||left(tp.discovery_preview_id::text,8),
        'target_active',private.test_target_active(tp.user_id,'tutor'),'academic_grade',tp.academic_grade,'teaching_skill_score',tp.teaching_skill_score,
        'status',coalesce(v.status::text,'not_started'),'last_event',coalesce(v.event_number,0),'last_reason',v.decision_note,
        'reviewed_at',v.created_at,'reviewer_id',v.reviewed_by,'token',private.tutor_review_token(tp.user_id),
        'subjects',coalesce((select jsonb_agg(q.subject_id order by q.subject_id) from public.tutor_subject_qualifications q where q.tutor_id=tp.user_id),'[]'),
        'languages',coalesce((select jsonb_agg(l.language order by l.language) from public.tutor_languages l where l.tutor_id=tp.user_id),'[]'),
        'evidence',case when e.id is null then null else jsonb_build_object('label',e.label,'note',e.note,'prepared_by',e.prepared_by,'created_at',e.created_at,'event_number',e.event_number) end,
        'approval_missing',array_remove(array[case when e.id is null then 'Synthetic test metadata has not been prepared' end,
          case when not exists(select 1 from public.tutor_subject_qualifications q where q.tutor_id=tp.user_id) then 'No trusted subject qualification' end,
          case when not exists(select 1 from public.tutor_languages l where l.tutor_id=tp.user_id) then 'No trusted language qualification' end],null)
      ) item from public.tutor_profiles tp
      left join lateral(select * from public.tutor_verification_records where tutor_id=tp.user_id order by event_number desc limit 1) v on true
      left join lateral(select * from public.tutor_test_evidence where tutor_id=tp.user_id order by event_number desc limit 1) e on true
      where tp.user_id<>actor and exists(select 1 from public.adult_test_accounts where user_id=tp.user_id) and (private.test_target_active(tp.user_id,'tutor') or v.status='approved')
        and (strpos(lower(tp.user_id::text),lower(trim(p_query)))>0 or strpos(lower('Test tutor '||left(tp.discovery_preview_id::text,8)),lower(trim(p_query)))>0)
      order by case when v.status is null or v.status='pending' then 0 else 1 end,tp.created_at,tp.user_id limit 51
    ) x;
    select coalesce(jsonb_agg(item),'[]') into safety from (
      select jsonb_build_object('id',r.id,'category',r.category,'summary',r.summary,'status',r.status,'revision',r.revision,'created_at',r.created_at,'updated_at',r.updated_at) item
      from public.test_safety_reports r where r.reporter_id<>actor and exists(select 1 from public.adult_test_accounts where user_id=r.reporter_id)
        and strpos(lower(r.id::text),lower(trim(p_query)))>0
      order by case when r.status in ('submitted','under_review') then 0 else 1 end,r.created_at desc,r.id limit 51
    ) x;
  end if;
  if administrator or is_guardian or is_learner then
    select coalesce(jsonb_agg(item),'[]') into links from (
      select jsonb_build_object('id',r.id,'guardian_id',r.guardian_id,'learner_id',r.learner_id,'status',r.status,'revision',r.revision,
        'consent_status',coalesce(c.status::text,'not_recorded'),'consent_event',coalesce(c.event_number,0),'policy_version',c.policy_version,'recorded_at',c.created_at,
        'can_share',coalesce(r.status='approved' and c.status='approved' and private.test_target_active(r.learner_id,'learner') and private.test_target_active(r.guardian_id,'guardian'),false)
      ) item from public.guardian_relationships r
      left join lateral(select * from public.guardian_consent_records where relationship_id=r.id order by event_number desc limit 1) c on true
      where (administrator or (is_guardian and r.guardian_id=actor) or (is_learner and r.learner_id=actor))
        and strpos(lower(r.id::text||r.guardian_id::text||r.learner_id::text),lower(trim(p_query)))>0
      order by r.created_at desc,r.id limit 51
    ) x;
  end if;
  select coalesce(jsonb_agg(item),'[]') into reports from (
    select jsonb_build_object('id',r.id,'category',r.category,'summary',r.summary,'status',r.status,'revision',r.revision,'created_at',r.created_at,'updated_at',r.updated_at) item
    from public.test_safety_reports r where reporter_id=actor and strpos(lower(r.id::text),lower(trim(p_query)))>0 order by r.created_at desc,r.id limit 51
  ) x;
  if administrator then
    select coalesce(jsonb_agg(item),'[]') into accounts from (
      select jsonb_build_object('id',a.user_id,'label','Test account '||left(a.user_id::text,8),'enabled',a.enabled,
        'available',a.enabled and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=now()),
        'roles',coalesce((select jsonb_agg(role order by role) from public.user_roles where user_id=a.user_id),'[]')) item
      from public.adult_test_accounts a join auth.users u on u.id=a.user_id
      where strpos(lower(a.user_id::text),lower(trim(p_query)))>0 order by a.created_at desc,a.user_id limit 51
    ) x;
  end if;
  if staff then
    select coalesce(jsonb_agg(item),'[]') into actions from (
      select jsonb_build_object('id',a.id,'operation',a.operation,'subject_id',a.subject_id,'actor_id',a.actor_id,'reason',a.reason,'created_at',a.created_at) item
      from public.test_trust_audit a where (administrator or a.actor_id=actor)
        and strpos(lower(a.subject_id::text),lower(trim(p_query)))>0 order by a.created_at desc,a.id limit 51
    ) x;
  end if;
  return jsonb_build_object('test_only',true,'as_of',statement_timestamp(),'staff',staff,'administrator',administrator,
    'tutor_reviews',private.trust_bound_rows(tutors),'relationships',private.trust_bound_rows(links),
    'reports',private.trust_bound_rows(reports),'safety_queue',private.trust_bound_rows(safety),
    'accounts',private.trust_bound_rows(accounts),'recent_actions',private.trust_bound_rows(actions),
    'more',jsonb_build_object('tutors',jsonb_array_length(tutors)>50,'relationships',jsonb_array_length(links)>50,'reports',jsonb_array_length(reports)>50,'safety',jsonb_array_length(safety)>50,'accounts',jsonb_array_length(accounts)>50,'actions',jsonb_array_length(actions)>50));
end $$;
create function private.test_history_page(rows jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
  select jsonb_build_object('records',coalesce(jsonb_agg(value order by ord) filter(where ord<=20),'[]'::jsonb),
    'more',jsonb_array_length(rows)>20,'next_before',case when jsonb_array_length(rows)>20 then (rows->19->>'event_number')::bigint else null end)
  from jsonb_array_elements(rows) with ordinality x(value,ord);
$$;
create function public.load_test_trust_history(p_kind text,p_subject_id uuid,p_before_event bigint default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_test_role(array['learner','tutor','guardian','champion','admin']::public.app_role[]); staff boolean; administrator boolean; rows jsonb;
begin
  if p_before_event is not null and p_before_event<=0 then raise exception 'Invalid history cursor' using errcode='22023'; end if;
  select exists(select 1 from public.user_roles where user_id=actor and role in ('champion','admin')),
    exists(select 1 from public.user_roles where user_id=actor and role='admin') into staff,administrator;
  if p_kind='tutor' then
    if not (staff or (actor=p_subject_id and exists(select 1 from public.user_roles where user_id=actor and role='tutor')))
      or not exists(select 1 from public.adult_test_accounts where user_id=p_subject_id) then raise exception 'Tutor history unavailable' using errcode='42501'; end if;
    select coalesce(jsonb_agg(item),'[]') into rows from (
      select jsonb_build_object('event_number',event_number,'status',status,'actor_id',reviewed_by,'note',decision_note,'created_at',created_at,'verified_grade',verified_grade,'policy_version',null,'from_status',null) item
      from public.tutor_verification_records where tutor_id=p_subject_id and (p_before_event is null or event_number<p_before_event) order by event_number desc limit 21
    ) x;
  elsif p_kind='consent' then
    if not exists(select 1 from public.guardian_relationships r where r.id=p_subject_id and (administrator or
      (r.guardian_id=actor and exists(select 1 from public.user_roles where user_id=actor and role='guardian')) or
      (r.learner_id=actor and exists(select 1 from public.user_roles where user_id=actor and role='learner')))) then raise exception 'Consent history unavailable' using errcode='42501'; end if;
    select coalesce(jsonb_agg(item),'[]') into rows from (
      select jsonb_build_object('event_number',event_number,'status',status,'actor_id',recorded_by,'note',decision_note,'created_at',created_at,'verified_grade',null,'policy_version',policy_version,'from_status',null) item
      from public.guardian_consent_records where relationship_id=p_subject_id and (p_before_event is null or event_number<p_before_event) order by event_number desc limit 21
    ) x;
  elsif p_kind='safety' then
    if not staff or not exists(select 1 from public.test_safety_reports where id=p_subject_id and reporter_id<>actor) then raise exception 'Independent safety history access required' using errcode='42501'; end if;
    select coalesce(jsonb_agg(item),'[]') into rows from (
      select jsonb_build_object('event_number',event_number,'status',to_status,'actor_id',actor_id,'note',action_note,'created_at',created_at,'verified_grade',null,'policy_version',null,'from_status',from_status) item
      from public.test_safety_actions where report_id=p_subject_id and (p_before_event is null or event_number<p_before_event) order by event_number desc limit 21
    ) x;
  else raise exception 'Unknown history kind' using errcode='22023'; end if;
  return private.test_history_page(rows);
end $$;
create function public.read_linked_test_learner(p_relationship_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_test_role(array['guardian']::public.app_role[]); learner uuid; result jsonb;
begin
  select learner_id into learner from public.guardian_relationships where id=p_relationship_id and guardian_id=actor and status='approved';
  if not found or not private.can_read_learner(learner) then raise exception 'Current adult-test consent required' using errcode='42501'; end if;
  select jsonb_build_object('test_only',true,'as_of',statement_timestamp(),'display_name',p.display_name,'language',p.preferred_language,
    'enrollments',coalesce((select jsonb_agg(jsonb_build_object('subject_id',subject_id,'language',language,'is_active',is_active) order by created_at) from public.learner_academic_enrollments where learner_id=learner),'[]'),
    'progress',coalesce((select jsonb_agg(jsonb_build_object('lesson_id',lesson_id,'checkpoint_percent',checkpoint_percent) order by lesson_id) from public.lesson_progress where learner_id=learner),'[]')
  ) into result from public.profiles p where p.id=learner;
  return result;
end $$;
revoke all on function private.trust_bound_rows(jsonb),private.test_history_page(jsonb) from public,anon,authenticated,service_role;
revoke all on function public.load_test_trust_workspace(text),public.load_test_trust_history(text,uuid,bigint),public.read_linked_test_learner(uuid) from public,anon,authenticated,service_role;
grant execute on function public.load_test_trust_workspace(text),public.load_test_trust_history(text,uuid,bigint),public.read_linked_test_learner(uuid) to authenticated;
commit;
