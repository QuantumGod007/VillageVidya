begin;
alter table public.tutor_profiles
  add column discovery_preview_enabled boolean not null default false,
  add column discovery_preview_id uuid not null default gen_random_uuid() unique check (discovery_preview_id<>user_id);
comment on column public.tutor_profiles.discovery_preview_enabled is 'Explicit opt-in to private adult-test matching previews, never production participation or bookability.';
comment on column public.tutor_profiles.discovery_preview_id is 'Opaque preview pseudonym; never expose the Auth user UUID through discovery.';

create function public.set_tutor_discovery_preview(p_enabled boolean, p_revision integer)
returns public.tutor_profiles language plpgsql security definer set search_path = '' as $$
declare caller uuid := private.require_live_tutor(); result public.tutor_profiles; begin
  if p_enabled is null then raise exception 'Choose a preview preference' using errcode='22023'; end if;
  select * into result from public.tutor_profiles where user_id=caller for update;
  if result.discovery_preview_enabled=p_enabled then return result; end if;
  if result.revision is distinct from p_revision then raise exception 'Profile changed. Refresh before changing preview preference' using errcode='40001'; end if;
  update public.tutor_profiles set discovery_preview_enabled=p_enabled where user_id=caller returning * into result;
  return result;
end $$;

-- Independent trusted evaluator. TS domain tests are a specification oracle;
-- authorization and all candidate decisions execute here, never in the browser.
create function private.evaluate_tutor_match(
  p_adult boolean, p_preview boolean, p_status public.review_status, p_academic_grade smallint,
  p_verified_grade smallint, p_subject boolean, p_language boolean, p_tss numeric,
  p_preference boolean, p_grade smallint
) returns jsonb language sql immutable security invoker set search_path = '' as $$
  with reasons as (
    select array_remove(array[
      case when p_adult is not true then 'adult_test_access_required' end,
      case when p_preview is not true then 'preview_opt_in_required' end,
      case when p_status is distinct from 'approved'::public.review_status then 'latest_test_approval_required' end,
      case when p_academic_grade is null or p_verified_grade is null or least(p_academic_grade,p_verified_grade)<p_grade then 'verified_grade_insufficient' end,
      case when p_subject is not true then 'subject_qualification_required' end,
      case when p_language is not true then 'language_qualification_required' end,
      case when p_tss is null or p_tss<50 or p_tss>100 then 'tss_floor_required' end
    ],null) as failures
  ) select jsonb_build_object(
    'eligible', cardinality(failures)=0,
    'reasons', failures,
    'factors', jsonb_build_object('subject',case when p_subject then 1 else 0 end,
      'language',case when p_language then 1 else 0 end,'teaching',coalesce(p_tss,0)/100,
      'availability',case when p_preference then 1 else 0 end),
    'score',case when cardinality(failures)=0 then
      35 + 30 + 0.20*p_tss + case when p_preference then 15 else 0 end else null end
  ) from reasons;
$$;
revoke all on function private.evaluate_tutor_match(boolean,boolean,public.review_status,smallint,smallint,boolean,boolean,numeric,boolean,smallint) from public, anon, authenticated, service_role;

create function public.discover_test_tutors(
  p_subject_id text, p_language public.learning_language,
  p_query text default '', p_weekday smallint default null,
  p_starts_at time default null, p_ends_at time default null,
  p_preference_only boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := private.require_live_learner();
  v_grade smallint; v_board text; v_subject public.subject_name;
  v_as_of timestamptz := statement_timestamp();
  v_local timestamp := v_as_of at time zone 'Asia/Kolkata';
  v_result jsonb;
begin
  if p_language is null or p_query is null or length(p_query)>64 or p_preference_only is null then
    raise exception 'Choose a language and a search of at most 64 characters' using errcode='22023';
  end if;
  if (p_weekday is null and (p_starts_at is not null or p_ends_at is not null))
    or (p_weekday is not null and (p_weekday not between 0 and 6 or p_starts_at is null or p_ends_at is null
      or p_starts_at>=p_ends_at or p_ends_at-p_starts_at not between interval '15 minutes' and interval '4 hours'
      or extract(second from p_starts_at)<>0 or extract(second from p_ends_at)<>0)) then
    raise exception 'Choose one complete weekly interval of 15 minutes to 4 hours' using errcode='22023';
  end if;
  select g.number,g.board_id,s.name into v_grade,v_board,v_subject
    from public.academic_subjects s join public.academic_grades g on g.id=s.grade_id
    join public.academic_boards b on b.id=g.board_id
    where s.id=p_subject_id and s.is_published and g.is_published and b.is_published;
  if not found then raise exception 'Choose a published academic subject' using errcode='22023'; end if;

  -- One candidate query/snapshot across all trust, qualification and preference
  -- records. No session reservation or private interval/evidence projection.
  with evidence as materialized (
    select tp.discovery_preview_id,least(tp.academic_grade,verification.verified_grade) as verified_grade,
      tp.teaching_skill_score,availability.has_weekly_preference,availability.preference_matches,
      private.evaluate_tutor_match(
        a.enabled and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=v_as_of),
        tp.discovery_preview_enabled, verification.status,tp.academic_grade,verification.verified_grade,
        exists(select 1 from public.tutor_subject_qualifications q where q.tutor_id=tp.user_id and q.subject_id=p_subject_id),
        exists(select 1 from public.tutor_languages l where l.tutor_id=tp.user_id and l.language=p_language),
        tp.teaching_skill_score,availability.preference_matches,v_grade
      ) as decision
    from public.tutor_profiles tp
    join public.adult_test_accounts a on a.user_id=tp.user_id
    join auth.users u on u.id=tp.user_id
    join public.user_roles r on r.user_id=tp.user_id and r.role='tutor'
    left join lateral (select v.status,v.verified_grade from public.tutor_verification_records v
      where v.tutor_id=tp.user_id order by v.event_number desc limit 1) verification on true
    cross join lateral (
      select exists(select 1 from public.tutor_availability av where av.tutor_id=tp.user_id and av.enabled) as has_weekly_preference,
        exists(select 1 from public.tutor_availability av where av.tutor_id=tp.user_id and av.enabled
          and av.weekday=coalesce(p_weekday,extract(dow from v_local)::smallint)
          and case when p_weekday is null then av.starts_at<=v_local::time and v_local::time<av.ends_at
            else av.starts_at<=p_starts_at and av.ends_at>=p_ends_at end) as preference_matches
    ) availability
    where tp.discovery_preview_enabled and tp.user_id<>caller
      and strpos(lower('Test tutor '||left(tp.discovery_preview_id::text,8)),lower(trim(p_query)))>0
      and exists(select 1 from public.academic_subjects s join public.academic_grades g on g.id=s.grade_id
        join public.academic_boards b on b.id=g.board_id where s.id=p_subject_id and s.is_published and g.is_published and b.is_published)
  ), ranked as materialized (
    select *,row_number() over(order by (decision->>'score')::numeric desc,discovery_preview_id) as position
    from evidence where (decision->>'eligible')::boolean and (not p_preference_only or preference_matches)
    order by (decision->>'score')::numeric desc,discovery_preview_id limit 25
  ) select jsonb_build_object(
    'test_only',true,'as_of',v_as_of,'expires_at',v_as_of+interval '60 seconds',
    'context',jsonb_build_object('subject_id',p_subject_id,'board_id',v_board,'grade',v_grade,'subject',v_subject,'language',p_language),
    'availability_basis',case when p_weekday is null then 'current_ist_time' else 'requested_weekly_window' end,
    'more_available',count(*)>24,
    'candidates',coalesce(jsonb_agg(jsonb_build_object(
      'preview_id',discovery_preview_id,'label','Test tutor '||left(discovery_preview_id::text,8),
      'eligible',true,'verified_grade',verified_grade,'teaching_skill_score',teaching_skill_score,
      'cms',(decision->>'score')::numeric,'factors',decision->'factors',
      'reasons',jsonb_build_array('adult_test_access','preview_opt_in','latest_test_approval','verified_grade_sufficient','exact_subject_qualification','qualified_language','tss_floor_met'),
      'has_weekly_preference',has_weekly_preference,'preference_matches',preference_matches
    ) order by position) filter(where position<=24),'[]'::jsonb)
  ) into v_result from ranked;
  return v_result;
end $$;
revoke all on function public.set_tutor_discovery_preview(boolean,integer), public.discover_test_tutors(text,public.learning_language,text,smallint,time,time,boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_tutor_discovery_preview(boolean,integer), public.discover_test_tutors(text,public.learning_language,text,smallint,time,time,boolean) to authenticated;
commit;
